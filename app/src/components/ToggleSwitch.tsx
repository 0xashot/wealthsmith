/**
 * ToggleSwitch — accessible on/off switch per components/toggle.md.
 *
 * Renders a native `<button role="switch">` (Space/Enter toggle for free) with
 * `aria-checked` state, labelled by the visible label text. It only reflects and
 * flips the boolean state it is given — no product logic here.
 */
interface Props {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Visible label text; also the switch's accessible name (Label in Name). */
  label: string;
  labelId: string;
}

export default function ToggleSwitch({ checked, onChange, label, labelId }: Props) {
  return (
    <span className="toggle">
      <span className="toggle__label" id={labelId}>
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        className="toggle__switch"
        data-checked={checked}
        onClick={() => onChange(!checked)}
      >
        <span className="toggle__thumb" aria-hidden="true" />
      </button>
    </span>
  );
}
