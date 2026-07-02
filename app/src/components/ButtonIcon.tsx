/**
 * ButtonIcon — a button/CTA icon that inherits the button's text color.
 *
 * Per components/button.md (Button Icons) and components/icon.md (Icons in
 * Buttons): button icons inherit the button foreground color by default.
 * The approved icon assets ship with a fixed stroke color, so the asset is
 * applied as a CSS mask and painted with `currentColor` — it follows the
 * CTA text color across enabled / hover / focus / disabled states, and the
 * asset file is never modified.
 *
 * Decorative next to a visible text label (`aria-hidden="true"`).
 */
interface Props {
  src: string;
  size?: number;
}

export default function ButtonIcon({ src, size = 16 }: Props) {
  const mask = `url(${src}) center / contain no-repeat`;
  return (
    <span
      aria-hidden="true"
      className="btn-icon"
      style={{ width: size, height: size, WebkitMask: mask, mask }}
    />
  );
}
