import { ChevronDown, Lightbulb, BookMarked } from "lucide-react";
import type { KeyConcept } from "@/components/mindmap/types";
import { getCategoryColor, getCategoryName } from "@/components/mindmap/types";
import StudySubsection from "./StudySubsection";
import StudyPersonCard from "./StudyPersonCard";
import StudyDateTimeline from "./StudyDateTimeline";
import StudyQuoteBlock from "./StudyQuoteBlock";
import StudyVerseChips from "./StudyVerseChips";

interface Props {
  index: number;
  concept: KeyConcept;
  expanded: boolean;
  onToggle: () => void;
  sectionId: string;
  active?: boolean;
  onVerseClick?: (ref: string, el: HTMLElement) => void;
  /** Lowercased names of people that should be rendered (others were already shown earlier). */
  showPeopleNames?: Set<string>;
  /** When true, this section is a continuation of a grouped block — render compactly without the title row. */
  isGroupedMember?: boolean;
  /** When false, hide the analogy block (avoids repeating "Pense assim" in every member of a group). */
  showAnalogy?: boolean;
}

export default function StudySection({
  index,
  concept,
  expanded,
  onToggle,
  sectionId,
  active,
  onVerseClick,
  showPeopleNames,
  isGroupedMember = false,
  showAnalogy = true,
}: Props) {
  const note = concept.expanded_note;
  const color = getCategoryColor(concept.category);
  const importance = concept.importance || "primary";
  const isTertiary = importance === "tertiary";
  const isSecondary = importance === "secondary";
  const slides = concept.source_slides && concept.source_slides.length > 0
    ? `Sl. ${concept.source_slides[0]}${concept.source_slides.length > 1 ? `-${concept.source_slides[concept.source_slides.length - 1]}` : ""}`
    : "";

  // Visual size hierarchy
  const titleSize = isTertiary ? "text-sm" : isSecondary ? "text-base" : "text-lg";
  const numberSize = isTertiary ? "w-5 h-5 text-[10px]" : "w-7 h-7 text-[11px]";
  const verticalPad = isTertiary ? "py-2" : "py-3";

  return (
    <section
      id={sectionId}
      className="scroll-mt-20 transition-all"
      style={{
        background: active ? "hsl(var(--primary) / 0.03)" : "transparent",
        borderRadius: 12,
        borderLeft: importance === "primary" ? `2px solid ${color}55` : "2px solid transparent",
        paddingLeft: importance === "primary" ? 8 : 0,
        opacity: isTertiary ? 0.78 : 1,
      }}
    >
      <button
        onClick={onToggle}
        className={`w-full flex items-start gap-3 px-1 ${verticalPad} text-left group`}
      >
        <span
          className={`flex-shrink-0 ${numberSize} rounded-full flex items-center justify-center font-ui font-bold mt-0.5`}
          style={{ background: `${color}22`, color }}
        >
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h3 className={`font-display ${titleSize} font-bold text-foreground tracking-tight leading-tight`}>
              {concept.title}
            </h3>
            <span className="text-[9px] tracking-[2px] uppercase font-ui" style={{ color }}>
              {getCategoryName(concept.category)}
            </span>
            {isTertiary && (
              <span className="text-[8.5px] tracking-[1.5px] uppercase font-ui text-muted-foreground/50">
                · resumo
              </span>
            )}
            {slides && (
              <span className="text-[10px] text-muted-foreground/60 font-ui ml-auto">
                {slides}
              </span>
            )}
          </div>
          {concept.summary && !expanded && (
            <p className="text-[13px] text-muted-foreground/80 font-body mt-1 line-clamp-2">
              {concept.summary}
            </p>
          )}
        </div>
        <ChevronDown
          size={16}
          className="text-muted-foreground/60 transition-transform mt-1.5 flex-shrink-0"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {expanded && note && (
        <div className="pl-10 pr-2 pb-5 animate-fade-in space-y-3">
          {note.core_idea && (
            <div
              className="p-3.5 rounded-xl"
              style={{
                background: `${color}0f`,
                border: `1px solid ${color}33`,
              }}
            >
              <p className="font-body italic text-[14px] text-foreground/90 leading-relaxed">
                {note.core_idea}
              </p>
            </div>
          )}

          {/* Key terms — visual glossary */}
          {note.key_terms && note.key_terms.length > 0 && (
            <div
              className="p-3.5 rounded-xl"
              style={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
              }}
            >
              <div className="flex items-center gap-1.5 mb-2.5">
                <BookMarked size={12} style={{ color }} />
                <p className="text-[10px] tracking-[2px] uppercase font-ui" style={{ color: `${color}cc` }}>
                  Glossário
                </p>
              </div>
              <dl className="space-y-2">
                {note.key_terms.map((kt, i) => (
                  <div key={i} className="flex flex-col gap-0.5">
                    <dt
                      className="text-[12.5px] font-display font-bold tracking-wide"
                      style={{ color }}
                    >
                      {kt.term}
                    </dt>
                    <dd className="text-[12.5px] font-body text-foreground/80 leading-relaxed">
                      {kt.definition}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* Analogy — didactic illustration */}
          {note.analogy && note.analogy.trim().length > 0 && (
            <div
              className="p-3.5 rounded-xl flex gap-3"
              style={{
                background: "hsl(48 50% 88% / 0.08)",
                border: "1px solid hsl(48 50% 60% / 0.25)",
              }}
            >
              <Lightbulb size={16} className="flex-shrink-0 mt-0.5" style={{ color: "hsl(48 70% 55%)" }} />
              <div>
                <p className="text-[10px] tracking-[2px] uppercase font-ui mb-1" style={{ color: "hsl(48 50% 55%)" }}>
                  Pense assim
                </p>
                <p className="text-[13.5px] font-body text-foreground/90 leading-relaxed italic">
                  {note.analogy}
                </p>
              </div>
            </div>
          )}

          {note.key_dates && note.key_dates.length > 0 && (
            <StudyDateTimeline dates={note.key_dates} />
          )}

          {note.key_points && note.key_points.length > 0 && (
            <ul className="space-y-1.5">
              {note.key_points.map((p, i) => (
                <li
                  key={i}
                  className="text-[14px] font-body text-foreground/90 leading-relaxed pl-4 relative"
                >
                  <span
                    className="absolute left-0 top-[9px] w-1.5 h-1.5 rounded-full"
                    style={{ background: color }}
                  />
                  {p}
                </li>
              ))}
            </ul>
          )}

          {note.subsections && note.subsections.length > 0 && (
            <div className="space-y-1.5">
              {note.subsections.map((s, i) => (
                <StudySubsection key={i} subsection={s} />
              ))}
            </div>
          )}

          {note.key_people && note.key_people.length > 0 && (
            <div className="space-y-2">
              {note.key_people.map((p, i) => (
                <StudyPersonCard key={i} person={p} />
              ))}
            </div>
          )}

          {note.stories && note.stories.length > 0 && (
            <div className="space-y-2">
              {note.stories.map((st, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl"
                  style={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                  }}
                >
                  <p className="text-[12px] font-ui font-semibold text-primary/80 mb-1.5 tracking-wide uppercase">
                    {st.title}
                  </p>
                  <p className="text-[13px] font-body text-foreground/85 leading-relaxed">
                    {st.narrative}
                  </p>
                </div>
              ))}
            </div>
          )}

          {note.author_quotes && note.author_quotes.length > 0 && (
            <div>
              {note.author_quotes.map((q, i) => (
                <StudyQuoteBlock key={i} quote={q} />
              ))}
            </div>
          )}

          {note.verses && note.verses.length > 0 && (
            <StudyVerseChips verses={note.verses} onSelect={onVerseClick} />
          )}

          {note.application && (
            <div
              className="p-3.5 rounded-xl"
              style={{
                background: "hsl(var(--primary) / 0.05)",
                border: "1px dashed hsl(var(--primary) / 0.3)",
              }}
            >
              <p className="text-[10px] tracking-[2px] uppercase font-ui text-primary/70 mb-1.5">
                Aplicação
              </p>
              <p className="text-[13px] font-body text-foreground/90 leading-relaxed">
                {note.application}
              </p>
            </div>
          )}

          {note.impact_phrase && (
            <p
              className="text-[13px] font-display italic text-center py-2 px-4"
              style={{ color }}
            >
              "{note.impact_phrase}"
            </p>
          )}
        </div>
      )}
    </section>
  );
}
