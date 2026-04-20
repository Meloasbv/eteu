import type { KeyConcept } from "@/components/mindmap/types";
import { getCategoryColor } from "@/components/mindmap/types";

interface Props {
  concepts: KeyConcept[];
  activeId?: string | null;
  onSelect: (id: string) => void;
}

export default function StudySummary({ concepts, activeId, onSelect }: Props) {
  return (
    <nav
      className="rounded-2xl p-4 mb-6"
      style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
    >
      <p className="text-[10px] tracking-[3px] uppercase text-primary/60 font-ui mb-3">
        Sumário
      </p>
      <ul className="space-y-1">
        {concepts.map((c, i) => {
          const color = getCategoryColor(c.category);
          const slides = c.source_slides && c.source_slides.length > 0
            ? `Sl. ${c.source_slides[0]}${c.source_slides.length > 1 ? `-${c.source_slides[c.source_slides.length - 1]}` : ""}`
            : "";
          const isActive = activeId === c.id;
          return (
            <li key={c.id}>
              <button
                onClick={() => onSelect(c.id)}
                className="w-full flex items-baseline gap-2 px-2 py-1.5 rounded-lg text-left transition-all hover:bg-muted/40"
                style={{
                  background: isActive ? "hsl(var(--primary) / 0.08)" : "transparent",
                }}
              >
                <span
                  className="text-[10px] font-ui font-bold flex-shrink-0 w-5"
                  style={{ color }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 text-[13px] font-body text-foreground/85 truncate">
                  {c.title}
                </span>
                {slides && (
                  <span className="text-[10px] text-muted-foreground/50 font-ui flex-shrink-0">
                    {slides}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
