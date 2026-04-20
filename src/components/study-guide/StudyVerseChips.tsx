import { BookOpen } from "lucide-react";
import type { VerseRef } from "@/components/mindmap/types";
import { verseRefString } from "@/components/mindmap/types";

interface Props {
  verses: (string | VerseRef)[];
  onSelect?: (ref: string) => void;
}

export default function StudyVerseChips({ verses, onSelect }: Props) {
  if (!verses || verses.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 my-2">
      {verses.map((v, i) => {
        const ref = verseRefString(v);
        const ctx = typeof v === "string" ? undefined : v.context;
        return (
          <button
            key={i}
            onClick={() => onSelect?.(ref)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-ui transition-all hover:scale-105 active:scale-95"
            style={{
              background: "hsl(var(--primary) / 0.08)",
              border: "1px solid hsl(var(--primary) / 0.2)",
              color: "hsl(var(--primary))",
            }}
            title={ctx}
          >
            <BookOpen size={10} />
            {ref}
          </button>
        );
      })}
    </div>
  );
}
