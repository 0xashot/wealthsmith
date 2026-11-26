/**
 * InfoBanner — the Info variant of the Alert (components/alert.md): a persistent inline message with a leading
 * icon, a title and a description. Neutral context that should stay on screen while it applies; not an error,
 * and not a control.
 *
 * `role="status"`, so it is announced when it appears without interrupting what is being read. The icon is
 * decorative — the title carries the meaning.
 */
import ButtonIcon from "./ButtonIcon";
import infoIconUrl from "../../../assets/icons/ui/info.svg";

export default function InfoBanner({ title, description }: { title: string; description?: string | null }) {
  return (
    <div className="alert alert--info" role="status">
      <span className="alert__icon"><ButtonIcon src={infoIconUrl} size={20} /></span>
      <div className="alert__content">
        <p className="alert__title">{title}</p>
        {description && <p className="alert__description">{description}</p>}
      </div>
    </div>
  );
}
