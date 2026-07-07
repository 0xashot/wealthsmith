/**
 * onboardingScript — the Smith AI conversational onboarding script, implementing
 * the approved product handoff transcript in
 * `docs/onboarding-conversation-handoff.md` (items 1–22).
 *
 * Smith is presented as an "AI financial planner." Each message is composed from
 * the fixed transcript copy with the user's REAL answers echoed in (goal, horizon,
 * risk, income, expenses, contribution rhythm, saving amount) plus one trivial
 * derived figure — available cash = income − expenses. Multi-year projection
 * figures (~$12k / ~$28k) are kept as fixed illustrative script (not recomputed).
 *
 * DETERMINISTIC / SCRIPTED — no live AI, no API call, no invented values. This
 * narrates the flow; it does NOT recalculate the Dashboard, Safety Buffer,
 * projections, allocation, suggestions, Top Pick, or protocol decisions, and it
 * moves no funds and requests no secrets. The parenthetical build-notes in the
 * transcript ("update the Portfolio value…", "Add quick actions here…", "If user
 * clicks…") are implemented as behavior and are not shown to the user.
 */
import {
  FINANCIAL_GOAL_OPTIONS,
  RISK_OPTIONS,
  TIMELINE_OPTIONS,
  CONTRIBUTION_OPTIONS,
  labelFor,
} from "./goalState";
import type { OnboardingAnswers } from "./onboardingState";

/**
 * Structured Smith AI message content (safe, no HTML). A message is either a
 * plain string (typed out) or an ordered list of approved blocks:
 *  - `p`       — a paragraph sentence.
 *  - `bullets` — a vertical list; each item has a bold `label` and a short `text`.
 * Only these block types are allowed; no arbitrary markup, no dangerouslySetInnerHTML.
 */
export interface BulletItem {
  label: string;
  text: string;
}
export type MessageBlock =
  | { type: "p"; text: string }
  | { type: "bullets"; items: BulletItem[] };
export type SmithMessage = string | MessageBlock[];

/* ---- Fixed transcript copy (verbatim; {tokens} are replaced with echoed answers) */

/** Item 1 — disconnected welcome (Smith intro + connect). */
export const SCRIPT_WELCOME =
  "Hello, I’m Smith, your AI financial planner.\n" +
  "I’ll help you understand your portfolio, optimize your mix, and build a strategy for your goals. Let’s start by connecting your wallet so I can load your actual data. You stay in control — I only read balances, never move funds.";

/** Item 2 — on connect: wallet connected + scanning (shown as the opener). */
export const SCRIPT_CONNECTED =
  "Perfect — wallet connected.\n" +
  "I’m scanning your holdings and preparing your financial snapshot…";

/** Item 3 — snapshot done + first question (goal). */
const S3 =
  "Done. I’ve updated your Financial Snapshot with your real wallet data. You can already see your current allocation on the left.\n" +
  "Let’s personalize your plan around your goals and comfort with risk. What’s your main goal right now?";

/** Item 4 — goal acknowledgment. */
const S4 =
  "Great — focusing on {goal}.\n" +
  "I’ll align your projections and recommendations around that outcome.";

/** Item 5 — time-horizon question. */
const S5 = "What’s your time horizon for this goal? Just roughly is fine.";

/** Item 6 — horizon acknowledgment. */
const S6 =
  "Got it — aiming to {goal} within {horizon}.\n" +
  "Let me adjust your projections and planning horizon accordingly.";

/** Item 7 — risk question. */
const S7 =
  "Everyone’s comfort with market swings is different. Which level best describes your risk appetite?";

/** Item 8 — risk acknowledgment. */
const S8 =
  "Understood — {risk} risk level it is.\n" +
  "I’ll tune your recommended allocation and growth expectations to match your comfort level.";

/** Item 9 — income question. */
const S9 =
  "To make your plan realistic, I just need a quick sense of your finances.\n" +
  "What’s your monthly income?";

/** Item 10 — income acknowledgment. */
const S10 =
  "Got it — {income} monthly income.\n" +
  "I’ll use this to calculate your real saving potential, risk buffer, and liquidity safety net.\n" +
  "Updating your Financial Snapshot and projections...";

/** Item 11 — projection statement (fixed illustrative). */
const S11 =
  "If you invest 10% of your income monthly, your portfolio could reach ~$12,000 in 5 years, or ~$28,000 in 10 years.";

/** Item 13 — expenses question (transcript numbering skips 12). */
const S13 =
  "And roughly how much do you spend monthly on essentials — rent, food, bills, etc.?";

/** Item 14 — expenses acknowledgment. */
const S14 =
  "Got it — you spend around {expenses} per month.\n" +
  "That leaves about {available} available for saving or investing monthly.\n" +
  "I’ll update your dashboard to reflect your real cash flow and safety buffer.";

/** Item 15 — financial-picture statement. */
const S15 =
  "Perfect — your financial picture is clear now.\n" +
  "With ~{available} free each month, you can comfortably grow your portfolio while keeping a strong safety net.";

/** Item 16 — contribution-rhythm question. */
const S16 =
  "Next, let’s set your contribution rhythm — how often you plan to add funds to your portfolio.";

/** Item 17 — contribution acknowledgment (the saving-amount input follows). */
const S17 =
  "Perfect — we’ll plan around {frequencyLower} contributions.\n" +
  "Consistency compounds growth, so even small monthly steps will move you closer to your goal.\n" +
  "Updating your dashboard projections and plan cadence...";

/** Item 18 — saving-amount acknowledgment. */
const S18 =
  "Great — I’ll model your plan using {saving}/month as a starting rhythm.\n" +
  "You’ll see your Projected Growth update after each real contribution.\n" +
  "And if your income or expenses change, I’ll adjust your target automatically.";

/** Item 20 — portfolio-tour intro (quick actions rendered separately). */
const S20 =
  "Let’s take a closer look at your portfolio — to see how your assets are currently positioned.";

/** Item 21 — Portfolio page tour (static), as structured, scannable content. */
export const SCRIPT_PORTFOLIO_TOUR: MessageBlock[] = [
  { type: "p", text: "Here’s your full Portfolio Overview." },
  { type: "p", text: "You’ll see:" },
  {
    type: "bullets",
    items: [
      { label: "Balance Overview", text: "all wallets and holdings in one view." },
      { label: "Crypto Assets Allocation", text: "how your crypto is balanced." },
      { label: "Assets Deployment Overview", text: "where your funds are working right now." },
    ],
  },
  {
    type: "p",
    text: "As you start investing or rebalancing, I’ll keep these updated automatically.",
  },
  {
    type: "p",
    text: "Next, let’s visit your Goal Page so you can see how everything connects.",
  },
];

/* ---- Quick-action labels ---- */
export const SCRIPT_OPEN_PORTFOLIO = "Open Portfolio";
export const SCRIPT_OPEN_GOAL = "Open Goal";
export const SCRIPT_FINISH_ONBOARDING = "Finish Onboarding";
export const SCRIPT_FINISH_SETUP = "Finish Setup";

/* ---- Value formatting + composition ---- */

/** Parse a raw currency answer ("3,000", "$3000") to a number, or NaN. */
function parseAmount(raw: string): number {
  return Number((raw ?? "").trim().replace(/[$,\s]/g, ""));
}

/** Format a numeric amount as "$X,XXX"; blank/invalid → an em dash. */
export function formatMoney(raw: string): string {
  const n = parseAmount(raw);
  return Number.isFinite(n) && raw.trim() !== "" ? `$${n.toLocaleString()}` : "—";
}

/** available cash = income − expenses (trivial deterministic math), formatted. */
function availableCash(a: OnboardingAnswers): string {
  const income = parseAmount(a.income);
  const expenses = parseAmount(a.expenses);
  if (!Number.isFinite(income) || !Number.isFinite(expenses)) return "—";
  return `$${(income - expenses).toLocaleString()}`;
}

/** Replace {tokens} with the user's echoed answers. */
function fill(template: string, a: OnboardingAnswers): string {
  const goal = labelFor(FINANCIAL_GOAL_OPTIONS, a.financial_goal);
  const horizon = labelFor(TIMELINE_OPTIONS, a.timeline);
  const risk = labelFor(RISK_OPTIONS, a.risk_tolerance);
  const frequency = labelFor(CONTRIBUTION_OPTIONS, a.contribution_frequency);
  const map: Record<string, string> = {
    goal,
    horizon,
    risk,
    frequency,
    frequencyLower: frequency.toLowerCase(),
    income: formatMoney(a.income),
    expenses: formatMoney(a.expenses),
    available: availableCash(a),
    saving: formatMoney(a.saving),
  };
  return template.replace(/\{(\w+)\}/g, (_, k) => map[k] ?? `{${k}}`);
}

/** Paragraph gap between distinct transcript beats within one Smith message. */
const P = "\n\n";

/**
 * The Smith message shown above the input for goal-setup step `index` (0–6).
 * It composes the previous answer's acknowledgment + any interstitial statement
 * + this step's question, echoing the user's real answers.
 */
export function stepLeadMessage(index: number, a: OnboardingAnswers): string {
  switch (index) {
    case 0:
      return S3;
    case 1:
      return fill(S4, a) + P + S5;
    case 2:
      return fill(S6, a) + P + S7;
    case 3:
      return fill(S8, a) + P + S9;
    case 4:
      return fill(S10, a) + P + S11 + P + S13;
    case 5:
      return fill(S14, a) + P + fill(S15, a) + P + S16;
    case 6:
      return fill(S17, a);
    default:
      return "";
  }
}

/**
 * Final summary message (contribution ack + plan summary + portfolio-tour intro),
 * structured so the plan reads as bold-labelled bullets — the same scannable
 * styling as the Goal tour, not a cramped inline string.
 */
export function summaryMessage(a: OnboardingAnswers): MessageBlock[] {
  return [
    { type: "p", text: fill(S18, a) },
    {
      type: "p",
      text: "All set — I’ve built your personalized plan based on everything you shared:",
    },
    {
      type: "bullets",
      items: [
        { label: "Goal", text: labelFor(FINANCIAL_GOAL_OPTIONS, a.financial_goal) },
        { label: "Horizon", text: labelFor(TIMELINE_OPTIONS, a.timeline) },
        { label: "Risk", text: labelFor(RISK_OPTIONS, a.risk_tolerance) },
        { label: "Income", text: formatMoney(a.income) },
        { label: "Expenses", text: formatMoney(a.expenses) },
        { label: "Contribution", text: `${formatMoney(a.saving)}/month` },
      ],
    },
    { type: "p", text: "You can review every detail and fine-tune it anytime." },
    { type: "p", text: S20 },
  ];
}

/** Goal page tour message (item 22), structured with the saved answers echoed. */
export function goalTourMessage(a: OnboardingAnswers): MessageBlock[] {
  return [
    {
      type: "p",
      text: "Here’s your current Goal setup — everything you’ve shared so far:",
    },
    {
      type: "bullets",
      items: [
        { label: "Goal", text: labelFor(FINANCIAL_GOAL_OPTIONS, a.financial_goal) },
        { label: "Timeline", text: labelFor(TIMELINE_OPTIONS, a.timeline) },
        { label: "Risk profile", text: labelFor(RISK_OPTIONS, a.risk_tolerance) },
        { label: "Monthly income", text: formatMoney(a.income) },
        { label: "Expenses", text: formatMoney(a.expenses) },
        {
          label: "Contribution rhythm",
          text: `${labelFor(CONTRIBUTION_OPTIONS, a.contribution_frequency)} (${formatMoney(a.saving)})`,
        },
      ],
    },
    {
      type: "p",
      text: "You can edit any of these anytime — or just ask me, and I’ll help you update your goal.",
    },
    {
      type: "p",
      text: "You’re now ready to explore your AI Strategy Steps — actionable insights tailored to your goals, risk, and cash flow.",
    },
  ];
}
