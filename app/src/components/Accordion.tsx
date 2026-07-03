/**
 * Accordion — accessible FAQ accordion per components/accordion.md.
 *
 * Multiple-open: each item toggles independently (users may compare answers).
 * Header is a real `<button aria-expanded aria-controls>`; the panel is a region
 * `aria-labelledby` its header. Chevron rotates to reflect state, but state is
 * carried by `aria-expanded` (never icon-only). Enter/Space toggle (native
 * button). It only renders the content it is given — no answers generated.
 */
import { useId, useState } from "react";
import ButtonIcon from "./ButtonIcon";
import chevronDownUrl from "../../../assets/icons/ui/chevron-down.svg";
import type { FaqBlock, FaqItem } from "../state/supportFaq";

function AnswerBlocks({ blocks, idPrefix }: { blocks: FaqBlock[]; idPrefix: string }) {
  return (
    <>
      {blocks.map((b, i) =>
        typeof b === "string" ? (
          <p key={`${idPrefix}-p-${i}`} className="accordion__text">
            {b}
          </p>
        ) : (
          <ul key={`${idPrefix}-l-${i}`} className="accordion__list">
            {b.list.map((li, j) => (
              <li key={`${idPrefix}-li-${i}-${j}`}>{li}</li>
            ))}
          </ul>
        )
      )}
    </>
  );
}

function AccordionRow({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false);
  const uid = useId();
  const headerId = `acc-h-${uid}`;
  const panelId = `acc-p-${uid}`;
  return (
    <div className="accordion__item">
      <h3 className="accordion__heading">
        <button
          type="button"
          id={headerId}
          className="accordion__trigger"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
        >
          <span className="accordion__question">{item.question}</span>
          <span
            className={"accordion__chevron" + (open ? " accordion__chevron--open" : "")}
            aria-hidden="true"
          >
            <ButtonIcon src={chevronDownUrl} size={18} />
          </span>
        </button>
      </h3>
      {open && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={headerId}
          className="accordion__panel"
        >
          <AnswerBlocks blocks={item.answer} idPrefix={panelId} />
        </div>
      )}
    </div>
  );
}

export default function Accordion({ items }: { items: FaqItem[] }) {
  return (
    <div className="accordion">
      {items.map((item) => (
        <AccordionRow key={item.id} item={item} />
      ))}
    </div>
  );
}
