import { Quote } from "lucide-react";
import type { AuthorQuote } from "@/components/mindmap/types";

export default function StudyQuoteBlock({ quote }: { quote: AuthorQuote }) {
  return (
    <blockquote
      className="my-3 p-3.5 rounded-xl relative"
      style={{
        background: "hsl(var(--muted) / 0.4)",
        borderLeft: "3px solid hsl(var(--primary) / 0.6)",
      }}
    >
      <Quote
        size={14}
        className="absolute top-2.5 right-2.5 text-primary/30"
      />
      <p className="text-[14px] font-body italic text-foreground/90 leading-relaxed">
        "{quote.text}"
      </p>
      {quote.author && (
        <p className="text-[11px] mt-1.5 text-primary/70 font-ui">— {quote.author}</p>
      )}
    </blockquote>
  );
}
