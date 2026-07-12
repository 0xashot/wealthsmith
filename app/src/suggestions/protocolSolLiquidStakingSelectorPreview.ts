/**
 * protocolSolLiquidStakingSelectorPreview — an INTERNAL-ONLY preview model for how
 * the future exact SOL staking recommendation UI would read (Step 13B).
 *
 * COPY MODEL ONLY. Hard-disabled and never mounted in the live app:
 *  - `PROTOCOL_SOL_LST_SELECTOR_PREVIEW_ENABLED = false`; default status `disabled`,
 *  - `internalOnly` always true; `showsInDashboard`/`showsInPortfolio`/
 *    `showsInReviewModal`/`updatesLiveSuggestions`/`transactionsEnabled` always false,
 *  - it selects no protocol (no `selectedProtocolName`/`selectedLstSymbol` by default),
 *  - it never uses the QA-only score, never claims production readiness, and is not
 *    imported by any live/engine/UI file.
 *
 * The example preview shows only blocked-state / future copy, tagged
 * `INTERNAL_PREVIEW_NOT_LIVE`. `PROTOCOL_SELECTION_IMPLEMENTED = false`;
 * `productionReady = false`.
 */

export const PROTOCOL_SOL_LST_SELECTOR_PREVIEW_EXISTS = true;
export const PROTOCOL_SOL_LST_SELECTOR_PREVIEW_ENABLED = false;
export const PROTOCOL_SOL_LST_SELECTOR_PREVIEW_INTERNAL_ONLY = true;
export const PROTOCOL_SOL_LST_SELECTOR_PREVIEW_SHOWS_IN_DASHBOARD = false;
export const PROTOCOL_SOL_LST_SELECTOR_PREVIEW_SHOWS_IN_PORTFOLIO = false;
export const PROTOCOL_SOL_LST_SELECTOR_PREVIEW_SHOWS_IN_REVIEW_MODAL = false;
export const PROTOCOL_SOL_LST_SELECTOR_PREVIEW_UPDATES_LIVE_SUGGESTIONS = false;
export const PROTOCOL_SOL_LST_SELECTOR_PREVIEW_ENABLES_TRANSACTIONS = false;

/** Marker for placeholder preview copy so it can never be mistaken for live output. */
export const INTERNAL_PREVIEW_NOT_LIVE = "INTERNAL_PREVIEW_NOT_LIVE";

export type SolLstSelectorPreviewStatus = "disabled" | "blocked" | "preview_available" | "unavailable";

export interface SolLstSelectorPreviewCopy {
  eyebrow: string;
  title: string;
  description: string;
  suggestedProtocolLabel?: string;
  selectedProtocolName?: string;
  selectedLstSymbol?: string;
  eligibleAmountLabel?: string;
  whySelected: string[];
  blockers: string[];
  safetyNotes: string[];
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
}

export interface SolLstSelectorPreviewResult {
  status: SolLstSelectorPreviewStatus;
  copy: SolLstSelectorPreviewCopy;
  internalOnly: true;
  showsInDashboard: false;
  showsInPortfolio: false;
  showsInReviewModal: false;
  updatesLiveSuggestions: false;
  transactionsEnabled: false;
}

const previewShell = (
  status: SolLstSelectorPreviewStatus,
  copy: SolLstSelectorPreviewCopy
): SolLstSelectorPreviewResult => ({
  status,
  copy,
  internalOnly: true,
  showsInDashboard: false,
  showsInPortfolio: false,
  showsInReviewModal: false,
  updatesLiveSuggestions: false,
  transactionsEnabled: false,
});

/**
 * The default (disabled) preview. No protocol is named. It states the preview is
 * off and reminds that WealthSmith does not move funds.
 */
export function getDefaultSolLstSelectorPreview(): SolLstSelectorPreviewResult {
  return previewShell("disabled", {
    eyebrow: "Internal preview",
    title: "SOL staking preview unavailable",
    description:
      "The internal SOL staking preview is disabled. WealthSmith will be able to suggest one liquid staking protocol to review only once production gates are approved.",
    whySelected: [],
    blockers: [
      "Selector preview is disabled.",
      "Protocol selection is disabled.",
      "Production go/no-go has not passed.",
    ],
    safetyNotes: ["WealthSmith does not move funds for you.", "This preview is not shown to users."],
    primaryActionLabel: "Preview disabled",
  });
}

/**
 * An INTERNAL-ONLY example of the future copy shape. It does NOT use live selector
 * output, names no selected protocol, uses no QA score, and claims no production
 * readiness — it shows blocked/future phrasing only, tagged INTERNAL_PREVIEW_NOT_LIVE.
 * Not imported by Dashboard / Portfolio / modal.
 */
export function getInternalOnlySolLstSelectorPreviewExample(): SolLstSelectorPreviewResult {
  return previewShell("blocked", {
    eyebrow: "Internal preview",
    title: "Put Idle SOL to Work",
    description:
      `WealthSmith will be able to suggest one liquid staking protocol to review once production gates are approved. (${INTERNAL_PREVIEW_NOT_LIVE})`,
    suggestedProtocolLabel: "Suggested protocol to review",
    // selectedProtocolName / selectedLstSymbol intentionally omitted — nothing selected.
    whySelected: [
      "Protocol selection is disabled.",
      "Production risk score is not approved.",
      "Source re-verification is still required.",
      "Go/no-go has not passed.",
    ],
    blockers: ["Selector preview is disabled.", "Production go/no-go has not passed."],
    safetyNotes: [
      "WealthSmith does not move funds for you.",
      "You choose whether to continue externally.",
      "This preview is not shown to users.",
    ],
    primaryActionLabel: "Preview disabled",
  });
}

/**
 * INTERNAL-ONLY future SELECTED-state copy example (Step 13C), for visual review on
 * the dev-only route. It names JitoSOL only as an INTERNAL_PREVIEW_NOT_LIVE example
 * — it claims no production readiness, uses no QA score, includes no
 * `selectedProtocolId`, and offers no transaction action. Not imported by any live
 * user flow (Dashboard / Portfolio / modal).
 */
export function getInternalOnlySolLstSelectedPreviewExample(): SolLstSelectorPreviewResult {
  return previewShell("preview_available", {
    eyebrow: `Internal preview · Not live (${INTERNAL_PREVIEW_NOT_LIVE})`,
    title: "Put Idle SOL to Work",
    description:
      "WealthSmith can show one liquid staking protocol to review once source, risk, and go/no-go gates are approved.",
    suggestedProtocolLabel: "Suggested protocol to review",
    selectedProtocolName: "Jito",
    selectedLstSymbol: "JitoSOL",
    eligibleAmountLabel: "Example: 10 SOL idle",
    whySelected: [
      "Meets the future TVL/adoption evidence requirement.",
      "Withdrawal mechanics and fee information are recorded for review.",
      "Security and operational evidence are recorded for review.",
      "Risk scoring and production approval are still disabled.",
    ],
    blockers: ["Production go/no-go has not passed.", "Selector preview is not live."],
    safetyNotes: [
      "WealthSmith does not move funds for you.",
      "You choose whether to continue externally.",
      "This preview is not shown to users.",
    ],
    primaryActionLabel: "Open official protocol page",
    secondaryActionLabel: "View evidence",
  });
}
