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
  "Hi, I’m Smith, your AI financial planner.\n\n" +
  "I’ll help you understand your portfolio and build a strategy around your goals.\n\n" +
  "To personalize your guidance, connect your wallet so I can securely read your balances. You stay in control—I can’t move funds or approve transactions.\n\n" +
  "Ready to connect your wallet?";

/** Item 2 — on connect: wallet connected (safe static opener; makes no claim wallet data was fetched/analyzed). */
export const SCRIPT_CONNECTED = "Perfect—wallet connected.";

/** Item 3 — snapshot done + first question (goal). */
const S3 =
  "I’ve updated your Financial Snapshot with your wallet data. You can see your current allocation on the left.\n\n" +
  "Now let’s personalize your plan. What’s your main financial goal?";

/** Item 4 — goal acknowledgment. */
const S4 =
  "Great — focusing on {goal}.\n" +
  "I’ll align your projections and recommendations around that outcome.";

/** Item 5 — time-horizon question. */
const S5 = "What’s your time horizon for this goal? Just roughly is fine.";

/** Item 6 — horizon acknowledgment. */
const S6 = "Got it—you’re aiming to {goalLower} with a {horizonShort} timeline.";

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
  "Got it—{income} in monthly income.\n\n" +
  "I’ll use this with your expenses to estimate your saving capacity and required Safety Buffer.";

/** Item 13 — expenses question (transcript numbering skips 12; the fixed illustrative projection was removed). */
const S13 =
  "About how much do you spend each month on essentials such as rent, food, and bills?";

/** Item 14 — expenses acknowledgment (available cash = income − expenses). */
const S14 =
  "Based on that, you have about {available} left each month for saving or investing.";

/** Item 15 — financial-picture statement. */
const S15 =
  "I’ll use this to calculate your Safety Buffer and shape a realistic contribution plan.";

/** Item 16 — contribution-rhythm question. */
const S16 =
  "How often do you plan to add funds to your portfolio?";

/** Item 17 — contribution acknowledgment + the saving-amount question (the amount input follows).
 *  Occasional contributions get their own variant (no fixed cadence, so the question asks per-contribution). */
const S17 =
  "We’ll plan around {cadence} contributions.\n\n" +
  "How much would you like to invest {cadence_label}?";
const S17_OCCASIONAL =
  "We’ll plan around occasional contributions.\n\n" +
  "About how much do you usually expect to invest each time?";


/** Item 21 — Portfolio page tour (static), as structured, scannable content. */
export const SCRIPT_PORTFOLIO_TOUR: MessageBlock[] = [
  { type: "p", text: "Here’s your portfolio." },
  { type: "p", text: "You can see:" },
  {
    type: "bullets",
    items: [
      { label: "Balance Overview", text: "your total portfolio value split between crypto and stables." },
      { label: "Crypto Assets Allocation", text: "the assets that make up your portfolio." },
      {
        label: "Asset Deployment Overview",
        text: "what remains liquid, what is staked, and what is deployed in yield strategies, including APY and estimated earnings where available.",
      },
    ],
  },
  {
    type: "p",
    text: "Next, let’s visit your Goal page to see how your portfolio aligns with your plan.",
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

/** Adverbial cadence phrase per contribution-frequency slug ("How much would you like to invest {cadence_label}?"). */
const CADENCE_LABEL: Record<string, string> = {
  weekly: "each week",
  biweekly: "every two weeks",
  monthly: "each month",
  quarterly: "each quarter",
  occasional: "each time",
};

/** Replace {tokens} with the user's echoed answers. */
function fill(template: string, a: OnboardingAnswers): string {
  const goal = labelFor(FINANCIAL_GOAL_OPTIONS, a.financial_goal);
  const horizon = labelFor(TIMELINE_OPTIONS, a.timeline);
  const risk = labelFor(RISK_OPTIONS, a.risk_tolerance);
  const frequency = labelFor(CONTRIBUTION_OPTIONS, a.contribution_frequency);
  const map: Record<string, string> = {
    goal,
    goalLower: goal.toLowerCase(),
    horizon,
    // Adjectival horizon for "a {horizonShort} timeline": lowercase + singular unit ("10+ Years" → "10+ year").
    horizonShort: horizon.toLowerCase().replace(/s$/, ""),
    risk,
    frequency,
    frequencyLower: frequency.toLowerCase(),
    cadence: frequency.toLowerCase(),
    cadence_label: CADENCE_LABEL[a.contribution_frequency] ?? "regularly",
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
      return fill(S10, a) + P + S13;
    case 5:
      return fill(S14, a) + P + fill(S15, a) + P + S16;
    case 6:
      return a.contribution_frequency === "occasional" ? S17_OCCASIONAL : fill(S17, a);
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
    { type: "p", text: "Your personalized plan is ready." },
    { type: "p", text: "Here’s what I’ve used:" },
    {
      type: "bullets",
      items: [
        { label: "Goal", text: labelFor(FINANCIAL_GOAL_OPTIONS, a.financial_goal) },
        { label: "Timeline", text: labelFor(TIMELINE_OPTIONS, a.timeline).toLowerCase() },
        { label: "Risk level", text: labelFor(RISK_OPTIONS, a.risk_tolerance) },
        { label: "Monthly income", text: formatMoney(a.income) },
        { label: "Monthly expenses", text: formatMoney(a.expenses) },
        { label: "Contribution", text: `${formatMoney(a.saving)} per month` },
      ],
    },
    { type: "p", text: "You can review and adjust these details anytime." },
    { type: "p", text: "Now let’s look at how your current portfolio compares with your plan." },
  ];
}

/** Goal page tour message (item 22). The plan details are shown in the Goal page itself, so this
 *  message just orients the user; the param is unused (kept for the shared tour-message signature). */
export function goalTourMessage(_a: OnboardingAnswers): MessageBlock[] {
  return [
    {
      type: "p",
      text: "This is your Goal page, where you can review and update your plan details anytime.",
    },
    {
      type: "p",
      text: "Next, explore your AI Strategy Steps—personalized recommendations based on your goal, risk profile, cash flow, and portfolio.",
    },
  ];
}
