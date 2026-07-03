/**
 * GoalPage — connected Goal Settings per patterns/goal-settings.md.
 *
 * View Mode (default) shows the saved plan values. Edit Mode edits a local
 * draft; Save commits the draft to the App-held saved goal state (Option A:
 * Goal-page scope only — Dashboard/derived outputs are NOT recalculated this
 * slice, per the visible prototype note). Discard reverts the draft. Toggling
 * Edit off with unsaved changes is a no-op (never silently discards or saves).
 *
 * Save-first, no product logic: no Safety Buffer / projection / allocation /
 * suggestion / Top Pick recalculation, no wallet signature, no transaction, no
 * live data. The examples/ fixture is never mutated.
 *
 * Read-only wallet context reuses the connected Dashboard state (Phantom • 6fQ9)
 * for the Global Nav pill. Ask Smith AI is intentionally hidden here (Decision
 * B) — no approved Goal-specific Smith AI content exists.
 */
import { useRef, useState } from "react";
import { dashboardState as connected } from "../state/dashboardState";
import { goalSmithAiContent } from "../state/goalSmithAi";
import {
  FINANCIAL_GOAL_OPTIONS,
  RISK_OPTIONS,
  CONTRIBUTION_OPTIONS,
  TIMELINE_OPTIONS,
  labelFor,
} from "../state/goalState";
import {
  TOAST_ADDRESS_COPIED,
  TOAST_COPY_FAILED,
  GOAL_PAGE_TITLE,
  GOAL_SECTION_GOAL_RISK,
  GOAL_SECTION_FINANCES,
  GOAL_SECTION_CONTRIBUTION,
  GOAL_EDIT_MODE_LABEL,
  GOAL_FIELD_FINANCIAL_GOAL,
  GOAL_FIELD_RISK,
  GOAL_FIELD_INCOME,
  GOAL_FIELD_EXPENSES,
  GOAL_FIELD_SAVING,
  GOAL_FIELD_CONTRIBUTION,
  GOAL_FIELD_TIMELINE,
  GOAL_OPTIONAL,
  GOAL_HELPER_INCOME,
  GOAL_HELPER_EXPENSES,
  GOAL_HELPER_SAVING,
  GOAL_SAVE,
  GOAL_DISCARD,
  GOAL_SAVED_TOAST,
  GOAL_PROTOTYPE_NOTE,
  GOAL_ERR_REQUIRED_AMOUNT,
  GOAL_ERR_INVALID_AMOUNT,
  GOAL_ERR_POSITIVE_AMOUNT,
} from "../state/approvedCopy";
import type { GoalOption, SavedGoal } from "../types/goal";
import GlobalNav from "../components/GlobalNav";
import PageHeader from "../components/PageHeader";
import ToggleSwitch from "../components/ToggleSwitch";
import SelectMenu from "../components/SelectMenu";
import AskSmithAiPanel from "../components/AskSmithAiPanel";

interface Props {
  pushToast: (message: string, helper?: string) => void;
  onNavigate: (id: string) => void;
  onDisconnect: () => void;
  savedGoal: SavedGoal;
  onSaveGoal: (goal: SavedGoal) => void;
}

/** String-based edit draft (currency fields kept as raw text while typing). */
interface Draft {
  financial_goal: string;
  risk_tolerance: string;
  timeline: string;
  contribution_frequency: string;
  income: string;
  expenses: string;
  saving: string;
}

const fmtUsd = (n: number) => `$${n.toLocaleString("en-US")}`;

function draftFromSaved(s: SavedGoal): Draft {
  return {
    financial_goal: s.financial_goal,
    risk_tolerance: s.risk_tolerance,
    timeline: s.timeline,
    contribution_frequency: s.contribution_frequency,
    income: String(s.income_monthly),
    expenses: String(s.expenses_monthly),
    saving: s.monthly_saving_goal == null ? "" : String(s.monthly_saving_goal),
  };
}

type Parsed = { blank: boolean; valid: boolean; negative: boolean; value: number };

/** Parse a currency field. Input format only — no financial interpretation. */
function parseAmount(raw: string): Parsed {
  const t = raw.trim().replace(/[$,\s]/g, "");
  if (t === "") return { blank: true, valid: true, negative: false, value: 0 };
  if (!/^-?\d+(\.\d+)?$/.test(t))
    return { blank: false, valid: false, negative: false, value: NaN };
  const value = Number(t);
  if (value < 0) return { blank: false, valid: false, negative: true, value };
  return { blank: false, valid: true, negative: false, value };
}

/** Validation errors keyed by currency field (selects are always valid). */
function validate(d: Draft) {
  const errs: { income?: string; expenses?: string; saving?: string } = {};
  const check = (raw: string, required: boolean) => {
    const p = parseAmount(raw);
    if (p.blank) return required ? GOAL_ERR_REQUIRED_AMOUNT : undefined;
    if (p.negative) return GOAL_ERR_POSITIVE_AMOUNT;
    if (!p.valid) return GOAL_ERR_INVALID_AMOUNT;
    return undefined;
  };
  const inc = check(d.income, true);
  if (inc) errs.income = inc;
  const exp = check(d.expenses, true);
  if (exp) errs.expenses = exp;
  const sav = check(d.saving, false);
  if (sav) errs.saving = sav;
  return errs;
}

function draftHasChanges(d: Draft, s: SavedGoal): boolean {
  if (
    d.financial_goal !== s.financial_goal ||
    d.risk_tolerance !== s.risk_tolerance ||
    d.timeline !== s.timeline ||
    d.contribution_frequency !== s.contribution_frequency
  )
    return true;
  const inc = parseAmount(d.income);
  if (inc.blank || !inc.valid || inc.value !== s.income_monthly) return true;
  const exp = parseAmount(d.expenses);
  if (exp.blank || !exp.valid || exp.value !== s.expenses_monthly) return true;
  const sav = parseAmount(d.saving);
  if (sav.blank) return s.monthly_saving_goal !== null;
  return !sav.valid || sav.value !== s.monthly_saving_goal;
}

export default function GoalPage({
  pushToast,
  onNavigate,
  onDisconnect,
  savedGoal,
  onSaveGoal,
}: Props) {
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => draftFromSaved(savedGoal));
  const [showErrors, setShowErrors] = useState(false);
  const [smithOpen, setSmithOpen] = useState(false);
  const askButtonRef = useRef<HTMLButtonElement>(null);

  const openAskSmithAi = () => setSmithOpen(true);
  const closeAskSmithAi = () => {
    setSmithOpen(false);
    askButtonRef.current?.focus();
  };

  const errors = validate(draft);
  const hasErrors = Object.keys(errors).length > 0;
  const hasChanges = draftHasChanges(draft, savedGoal);

  const onCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(connected.wallet.address);
      pushToast(TOAST_ADDRESS_COPIED);
    } catch {
      pushToast(TOAST_COPY_FAILED);
    }
  };

  const disconnect = () => {
    pushToast(
      connected.transitions.disconnect_wallet.copy.toast,
      connected.transitions.disconnect_wallet.copy.helper
    );
    onDisconnect();
  };

  // Edit Mode toggle. On: seed a fresh draft from saved. Off: only leave when
  // there are no unsaved changes (never silently discard/save — pattern rule).
  const onToggleEdit = (next: boolean) => {
    if (next) {
      setDraft(draftFromSaved(savedGoal));
      setShowErrors(false);
      setEditMode(true);
    } else if (!hasChanges) {
      setEditMode(false);
    }
    // else: unsaved changes — no-op; user must Save or Discard.
  };

  const discard = () => {
    setDraft(draftFromSaved(savedGoal));
    setShowErrors(false);
    setEditMode(false);
  };

  const save = () => {
    setShowErrors(true);
    if (hasErrors) {
      // Move focus to the first invalid field for assistive tech.
      const firstKey = (["income", "expenses", "saving"] as const).find((k) => errors[k]);
      if (firstKey) document.getElementById(`goal-${firstKey}`)?.focus();
      return;
    }
    const inc = parseAmount(draft.income);
    const exp = parseAmount(draft.expenses);
    const sav = parseAmount(draft.saving);
    onSaveGoal({
      financial_goal: draft.financial_goal,
      risk_tolerance: draft.risk_tolerance,
      timeline: draft.timeline,
      contribution_frequency: draft.contribution_frequency,
      income_monthly: inc.value,
      expenses_monthly: exp.value,
      monthly_saving_goal: sav.blank ? null : sav.value,
    });
    setEditMode(false);
    setShowErrors(false);
    pushToast(GOAL_SAVED_TOAST);
  };

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  // ---- field renderers -----------------------------------------------------

  const selectField = (
    id: string,
    label: string,
    options: GoalOption[],
    value: string,
    onSelect: (v: string) => void,
    savedValue: string
  ) => (
    <div className="goal-field">
      <span className="goal-field__label" id={id}>
        {label}
      </span>
      {editMode ? (
        <SelectMenu labelId={id} options={options} value={value} onChange={onSelect} />
      ) : (
        <span className="goal-field__value">{labelFor(options, savedValue)}</span>
      )}
    </div>
  );

  const currencyField = (
    key: "income" | "expenses" | "saving",
    label: string,
    helper: string,
    savedValue: number | null,
    optional: boolean
  ) => {
    const id = `goal-${key}`;
    const helperId = `${id}-helper`;
    const errorId = `${id}-error`;
    const error = showErrors ? errors[key] : undefined;
    return (
      <div className="goal-field">
        <label className="goal-field__label" htmlFor={id}>
          {label}
          {optional && <span className="goal-field__optional"> ({GOAL_OPTIONAL})</span>}
        </label>
        {editMode ? (
          <>
            <div className="goal-currency">
              <span className="goal-currency__prefix" aria-hidden="true">
                $
              </span>
              <input
                id={id}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                className="goal-input goal-currency__input"
                value={draft[key]}
                onChange={(e) => set({ [key]: e.target.value } as Partial<Draft>)}
                aria-describedby={error ? `${helperId} ${errorId}` : helperId}
                aria-invalid={error ? true : undefined}
              />
            </div>
            <p className="goal-field__helper" id={helperId}>
              {helper}
            </p>
            {error && (
              <p className="goal-field__error" id={errorId} role="alert">
                {error}
              </p>
            )}
          </>
        ) : (
          <span className="goal-field__value">
            {savedValue == null ? "—" : fmtUsd(savedValue)}
          </span>
        )}
      </div>
    );
  };

  const editLabelId = "goal-edit-mode-label";

  return (
    <div className="app-shell">
      <GlobalNav
        mode="connected"
        nav={connected.global_nav}
        wallet={connected.wallet}
        navLabel={connected.accessibility.global_nav_label}
        walletPillLabel={connected.accessibility.wallet_pill_label}
        askSmithAiLabel={connected.global_nav.right_actions.ask_smith_ai.accessibility_label}
        askAvailable={true}
        askButtonRef={askButtonRef}
        activePage="goal"
        onNavigate={onNavigate}
        onCopyAddress={onCopyAddress}
        onDisconnect={disconnect}
        onOpenAskSmithAi={openAskSmithAi}
      />

      <div className={"dashboard" + (smithOpen ? "" : " dashboard--single")}>
        <main className="dashboard__main">
          <PageHeader header={{ title: GOAL_PAGE_TITLE }} />

          <p className="goal-note">{GOAL_PROTOTYPE_NOTE}</p>

          <div className="goal-toolbar">
            <ToggleSwitch
              checked={editMode}
              onChange={onToggleEdit}
              label={GOAL_EDIT_MODE_LABEL}
              labelId={editLabelId}
            />
          </div>

          <section className="card" aria-labelledby="goal-sec-1">
            <h2 id="goal-sec-1" className="card__title">
              {GOAL_SECTION_GOAL_RISK}
            </h2>
            <div className="goal-fields">
              {selectField(
                "goal-financial-goal",
                GOAL_FIELD_FINANCIAL_GOAL,
                FINANCIAL_GOAL_OPTIONS,
                draft.financial_goal,
                (v) => set({ financial_goal: v }),
                savedGoal.financial_goal
              )}
              {selectField(
                "goal-risk",
                GOAL_FIELD_RISK,
                RISK_OPTIONS,
                draft.risk_tolerance,
                (v) => set({ risk_tolerance: v }),
                savedGoal.risk_tolerance
              )}
            </div>
          </section>

          <section className="card" aria-labelledby="goal-sec-2">
            <h2 id="goal-sec-2" className="card__title">
              {GOAL_SECTION_FINANCES}
            </h2>
            <div className="goal-fields">
              {currencyField("income", GOAL_FIELD_INCOME, GOAL_HELPER_INCOME, savedGoal.income_monthly, false)}
              {currencyField("expenses", GOAL_FIELD_EXPENSES, GOAL_HELPER_EXPENSES, savedGoal.expenses_monthly, false)}
              {currencyField("saving", GOAL_FIELD_SAVING, GOAL_HELPER_SAVING, savedGoal.monthly_saving_goal, true)}
            </div>
          </section>

          <section className="card" aria-labelledby="goal-sec-3">
            <h2 id="goal-sec-3" className="card__title">
              {GOAL_SECTION_CONTRIBUTION}
            </h2>
            <div className="goal-fields">
              {selectField(
                "goal-contribution",
                GOAL_FIELD_CONTRIBUTION,
                CONTRIBUTION_OPTIONS,
                draft.contribution_frequency,
                (v) => set({ contribution_frequency: v }),
                savedGoal.contribution_frequency
              )}
              {selectField(
                "goal-timeline",
                GOAL_FIELD_TIMELINE,
                TIMELINE_OPTIONS,
                draft.timeline,
                (v) => set({ timeline: v }),
                savedGoal.timeline
              )}
            </div>
          </section>

          {editMode && (
            <div className="goal-actions">
              <button type="button" className="goal-btn goal-btn--secondary" onClick={discard}>
                {GOAL_DISCARD}
              </button>
              <button
                type="button"
                className="goal-btn goal-btn--primary"
                onClick={save}
                disabled={!hasChanges}
              >
                {GOAL_SAVE}
              </button>
            </div>
          )}
        </main>

        {smithOpen && (
          <AskSmithAiPanel content={goalSmithAiContent} onClose={closeAskSmithAi} />
        )}
      </div>
    </div>
  );
}
