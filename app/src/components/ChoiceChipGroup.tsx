/**
 * ChoiceChipGroup — single-select conversational Choice Chips per
 * components/choice-chip.md. Used for onboarding choice questions (Financial
 * Goal, Risk Level, Time Horizon, Contribution Rhythm) as the user's reply
 * options.
 *
 * Radio-group semantics: role="radiogroup" labelled by the question, each chip is
 * role="radio" with aria-checked and roving tabindex; Arrow/Home/End move and
 * select, Space/Enter select the focused chip. Options and labels are the
 * canonical Goal Settings values (Decision A) — nothing is invented or
 * transformed, and selection is reported to the parent (no financial logic here).
 */
import { useRef } from "react";
import type { GoalOption } from "../types/goal";

interface Props {
  /** id of the visible question that labels the group. */
  labelledById: string;
  options: GoalOption[];
  value: string;
  onChange: (value: string) => void;
}

export default function ChoiceChipGroup({ labelledById, options, value, onChange }: Props) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));

  const onKeyDown = (e: React.KeyboardEvent) => {
    const last = options.length - 1;
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      next = selectedIndex >= last ? 0 : selectedIndex + 1;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      next = selectedIndex <= 0 ? last : selectedIndex - 1;
    } else if (e.key === "Home") {
      next = 0;
    } else if (e.key === "End") {
      next = last;
    }
    if (next >= 0) {
      e.preventDefault();
      onChange(options[next].value);
      refs.current[next]?.focus();
    }
  };

  return (
    <div
      className="choice-chip-group"
      role="radiogroup"
      aria-labelledby={labelledById}
      onKeyDown={onKeyDown}
    >
      {options.map((o, i) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            className={"choice-chip" + (selected ? " choice-chip--selected" : "")}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
