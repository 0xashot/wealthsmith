/**
 * Goal Ask Smith AI content — static, explain-only, approved copy.
 *
 * Explains the saved goal settings on the Goal page only. No live generation,
 * no investment advice, no invented values, and — critically — it states that
 * this prototype does NOT recalculate the Dashboard, suggestions, Safety Buffer,
 * or projections. All copy below is the approved Goal-safe content; free-form
 * input returns the approved fallback only.
 */
import type { SmithAiContent } from "../types/dashboard";

const GOAL_SAFE_MESSAGE =
  "I can explain your saved goal settings on this page. In this prototype, " +
  "changing goals here does not recalculate your Dashboard, suggestions, " +
  "Safety Buffer, or projections.";

const Q_AFFECT = "What do these settings affect?";
const Q_DASHBOARD = "Why doesn’t the Dashboard update?";
const Q_SAVING = "What is Monthly Contribution?";

export const goalSmithAiContent: SmithAiContent = {
  panelLabel: "Smith AI panel",
  entryLabel: "Ask Smith AI",
  opener: GOAL_SAFE_MESSAGE,
  prompts: [Q_AFFECT, Q_DASHBOARD, Q_SAVING],
  responses: {
    [Q_AFFECT]:
      "These settings describe your plan: goal, risk level, time horizon, " +
      "income, expenses, contribution rhythm, and monthly contribution. In this " +
      "prototype, saving changes updates this Goal page only.",
    [Q_DASHBOARD]:
      "Dashboard recalculation is out of scope for this prototype. Your " +
      "Dashboard, suggestions, Safety Buffer, and projections remain based on " +
      "the approved fixture data.",
    [Q_SAVING]:
      "Monthly Contribution is the amount you plan to invest each month. It’s a " +
      "required plan input used to model your projection.",
  },
  fallback: GOAL_SAFE_MESSAGE,
};
