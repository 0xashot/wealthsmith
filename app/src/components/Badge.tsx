/**
 * Badge — per components/badge.md. Text-based status chip; never the only
 * source of meaning (always paired with card text).
 */
interface Props {
  label: string;
  tone: "info" | "warning" | "danger" | "success" | "neutral";
}

export default function Badge({ label, tone }: Props) {
  return <span className={`badge badge--${tone}`}>{label}</span>;
}
