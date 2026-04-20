import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { NoteSubsection } from "@/components/mindmap/types";

interface Props {
  subsection: NoteSubsection;
  defaultOpen?: boolean;
}

export default function StudySubsection({ subsection, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className="rounded-lg overflow-hidden my-1.5"
      style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/30 transition-colors"
      >
        <ChevronRight
          size={14}
          className="text-primary/60 transition-transform flex-shrink-0"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
        />
        <span className="text-[13px] font-display font-semibold text-foreground tracking-wide flex-1">
          {subsection.subtitle}
        </span>
        <span className="text-[10px] text-muted-foreground/60 font-ui">
          {subsection.points.length} {subsection.points.length === 1 ? "ponto" : "pontos"}
        </span>
      </button>
      {open && (
        <ul className="px-4 pb-3 space-y-1.5 animate-fade-in">
          {subsection.points.map((p, i) => (
            <li
              key={i}
              className="text-[13px] font-body text-foreground/85 leading-relaxed pl-3 relative"
            >
              <span
                className="absolute left-0 top-[8px] w-1 h-1 rounded-full"
                style={{ background: "hsl(var(--primary) / 0.6)" }}
              />
              {p}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
