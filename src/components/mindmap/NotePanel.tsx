import { useState, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import type { KeyConcept } from "../types";
import { getCategoryColor, getCategoryName } from "../types";
import VersePopover from "./VersePopover";

// Regex to detect Bible references inline
const VERSE_REGEX = /\b((?:Gn|Gên|Êx|Lv|Nm|Dt|Js|Jz|Rt|1Sm|2Sm|1Rs|2Rs|1Cr|2Cr|Ed|Ne|Et|Jó|Sl|Pv|Ec|Ct|Is|Jr|Lm|Ez|Dn|Os|Jl|Am|Ob|Jn|Mq|Na|Hc|Sf|Ag|Zc|Ml|Mt|Mc|Lc|Jo|At|Rm|1Co|2Co|Gl|Ef|Fp|Cl|1Ts|2Ts|1Tm|2Tm|Tt|Fm|Hb|Tg|1Pe|2Pe|1Jo|2Jo|3Jo|Jd|Ap|Gênesis|Êxodo|Levítico|Números|Deuteronômio|Josué|Juízes|Rute|Samuel|Reis|Crônicas|Esdras|Neemias|Ester|Salmos?|Provérbios|Eclesiastes|Cantares|Isaías|Jeremias|Lamentações|Ezequiel|Daniel|Oséias|Joel|Amós|Obadias|Jonas|Miquéias|Naum|Habacuque|Sofonias|Ageu|Zacarias|Malaquias|Mateus|Marcos|Lucas|João|Atos|Romanos|Coríntios|Gálatas|Efésios|Filipenses|Colossenses|Tessalonicenses|Timóteo|Tito|Filemom|Hebreus|Tiago|Pedro|Judas|Apocalipse)\.?\s*\d+[:.]\d+(?:\s*[-–]\s*\d+)?)\b/gi;

function InlineVerseText({
  text,
  onVerseClick,
}: {
  text: string;
  onVerseClick: (ref: string, el: HTMLElement) => void;
}) {
  const parts: (string | { ref: string; key: number })[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const regex = new RegExp(VERSE_REGEX.source, "gi");
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push({ ref: match[1], key: key++ });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));

  return (
    <>
      {parts.map((p, i) =>
        typeof p === "string" ? (
          <span key={i}>{p}</span>
        ) : (
          <span
            key={`v-${p.key}`}
            className="cursor-pointer font-body italic font-semibold transition-all"
            style={{
              color: "#c4a46a",
              borderBottom: "1px dashed rgba(196,164,106,0.3)",
            }}
            onClick={(e) => {
              e.stopPropagation();
              onVerseClick(p.ref, e.currentTarget as HTMLElement);
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = "#d4b87a";
              (e.currentTarget as HTMLElement).style.borderBottomColor = "#d4b87a";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = "#c4a46a";
              (e.currentTarget as HTMLElement).style.borderBottomColor = "rgba(196,164,106,0.3)";
            }}
          >
            {p.ref}
          </span>
        )
      )}
    </>
  );
}

interface NotePanelProps {
  concept: KeyConcept | null;
  concepts: KeyConcept[];
  currentIndex: number;
  onNavigate: (index: number) => void;
  onClose: () => void;
}

export default function NotePanel({
  concept,
  concepts,
  currentIndex,
  onNavigate,
  onClose,
}: NotePanelProps) {
  const isMobile = useIsMobile();
  const [versePopover, setVersePopover] = useState<{
    ref: string;
    anchor: HTMLElement;
    siblings: string[];
  } | null>(null);

  const allVerses = concept
    ? [
        ...(concept.expanded_note?.verses || concept.bible_refs || []),
      ]
    : [];

  const handleVerseClick = useCallback(
    (ref: string, el: HTMLElement) => {
      setVersePopover({ ref, anchor: el, siblings: allVerses });
    },
    [allVerses]
  );

  if (!concept) return null;

  const catColor = getCategoryColor(concept.category);
  const catName = getCategoryName(concept.category);
  const note = concept.expanded_note;
  const topicConcepts = concepts.filter(
    (c) => !c.type || c.type === "topic"
  );
  const topicIndex = topicConcepts.findIndex((c) => c.id === concept.id);
  const total = topicConcepts.length;

  // Legacy fallback
  const coreIdea = note?.core_idea || concept.coreIdea || "";
  const explanation = note?.explanation || concept.description || "";
  const affirmations = note?.affirmations || concept.keyPoints || [];
  const verses = note?.verses || concept.bible_refs || [];
  const application = note?.application || concept.practicalApplication || "";
  const impactPhrase = note?.impact_phrase || concept.impactPhrase || "";

  const canPrev = currentIndex > 0;
  const canNext = currentIndex < concepts.length - 1;

  const content = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3 shrink-0 sticky top-0 z-10"
        style={{
          background: "rgba(26,22,16,0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(196,164,106,0.1)",
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: catColor }}
          />
          <span
            className="text-[10px] font-sans font-bold tracking-[1.5px] uppercase"
            style={{ color: catColor }}
          >
            {catName}
          </span>
          {isMobile && total > 0 && (
            <span className="text-[10px] font-sans" style={{ color: "#5c5347" }}>
              · {topicIndex + 1}/{total}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
        >
          <X size={18} style={{ color: "#8a7d6a" }} />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-0">
        {/* Title */}
        <h2
          className="font-display font-bold mb-5"
          style={{
            color: "#ede4d3",
            fontSize: isMobile ? 24 : 32,
            lineHeight: 1.2,
          }}
        >
          {concept.title}
        </h2>

        {/* Core Idea */}
        {coreIdea && (
          <div
            className="mb-6"
            style={{
              background: "rgba(196,164,106,0.06)",
              borderLeft: "3px solid rgba(196,164,106,0.4)",
              borderRadius: "0 12px 12px 0",
              padding: "14px 18px",
            }}
          >
            <p
              className="font-body text-[15px] italic"
              style={{ color: "#ede4d3", lineHeight: 1.6 }}
            >
              {coreIdea}
            </p>
          </div>
        )}

        {/* Explanation */}
        {explanation && (
          <>
            <SectionLabel>EXPLICAÇÃO</SectionLabel>
            <div className="mb-6">
              {explanation.split("\n\n").map((para, i) => (
                <p
                  key={i}
                  className="font-body text-[15px] mb-3"
                  style={{ color: "#c4b89e", lineHeight: 1.75 }}
                >
                  <InlineVerseText
                    text={para}
                    onVerseClick={handleVerseClick}
                  />
                </p>
              ))}
            </div>
          </>
        )}

        {/* Affirmations */}
        {affirmations.length > 0 && (
          <>
            <SectionLabel>AFIRMAÇÕES CENTRAIS</SectionLabel>
            <div className="space-y-2 mb-6">
              {affirmations.map((a, i) => (
                <div
                  key={i}
                  className="pl-3.5"
                  style={{
                    borderLeft: "2px solid #d4b87a",
                    padding: "8px 14px",
                  }}
                >
                  <p
                    className="font-body text-[14px] italic"
                    style={{ color: "#d4b87a" }}
                  >
                    {a}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Verses */}
        {verses.length > 0 && (
          <>
            <SectionLabel>VERSÍCULOS</SectionLabel>
            <div className="flex flex-wrap gap-2 mb-6">
              {verses.map((v, i) => (
                <button
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-[20px] transition-all"
                  style={{
                    background: "rgba(123,163,201,0.06)",
                    border: "1px solid rgba(123,163,201,0.25)",
                    padding: "6px 12px",
                  }}
                  onClick={(e) =>
                    handleVerseClick(v, e.currentTarget as HTMLElement)
                  }
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "rgba(123,163,201,0.14)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "rgba(123,163,201,0.06)";
                  }}
                >
                  <BookOpen size={12} style={{ color: "#7ba3c9" }} />
                  <span
                    className="font-body italic text-[12.5px]"
                    style={{ color: "#7ba3c9" }}
                  >
                    {v}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Application */}
        {application && (
          <>
            <SectionLabel>APLICAÇÃO</SectionLabel>
            <div className="mb-6">
              {application.split("\n\n").map((para, i) => (
                <p
                  key={i}
                  className="font-body text-[15px] mb-3"
                  style={{ color: "#c4b89e", lineHeight: 1.75 }}
                >
                  <InlineVerseText
                    text={para}
                    onVerseClick={handleVerseClick}
                  />
                </p>
              ))}
            </div>
          </>
        )}

        {/* Impact Phrase */}
        {impactPhrase && (
          <>
            <SectionLabel>FRASE DE IMPACTO</SectionLabel>
            <div
              className="mb-6 text-center relative"
              style={{
                background:
                  "linear-gradient(135deg, rgba(196,164,106,0.1), rgba(196,164,106,0.04))",
                borderTop: "1px solid rgba(196,164,106,0.15)",
                borderBottom: "1px solid rgba(196,164,106,0.15)",
                padding: "18px 24px",
              }}
            >
              <span
                className="absolute top-2 left-4 font-body text-[30px] select-none"
                style={{ color: "rgba(196,164,106,0.2)", lineHeight: 1 }}
              >
                "
              </span>
              <p
                className="font-body font-semibold"
                style={{
                  color: "#d4b87a",
                  fontSize: isMobile ? 15 : 17,
                  lineHeight: 1.5,
                }}
              >
                {impactPhrase}
              </p>
              <span
                className="absolute bottom-1 right-4 font-body text-[30px] select-none"
                style={{ color: "rgba(196,164,106,0.2)", lineHeight: 1 }}
              >
                "
              </span>
            </div>
          </>
        )}

        <div className="h-20" />
      </div>

      {/* Navigator */}
      <div
        className="flex items-center justify-between px-5 py-3 shrink-0 sticky bottom-0"
        style={{
          background: "rgba(22,19,15,0.95)",
          backdropFilter: "blur(12px)",
          borderTop: "1px solid rgba(196,164,106,0.08)",
        }}
      >
        <button
          onClick={() => canPrev && onNavigate(currentIndex - 1)}
          disabled={!canPrev}
          className="flex items-center gap-1 text-[12px] font-sans transition-colors disabled:opacity-20"
          style={{ color: "#c4a46a" }}
        >
          <ChevronLeft size={14} />
          Anterior
        </button>
        <span className="text-[11px] font-sans" style={{ color: "#5c5347" }}>
          {concept.title} · {topicIndex + 1}/{total}
        </span>
        <button
          onClick={() => canNext && onNavigate(currentIndex + 1)}
          disabled={!canNext}
          className="flex items-center gap-1 text-[12px] font-sans transition-colors disabled:opacity-20"
          style={{ color: "#c4a46a" }}
        >
          Próximo
          <ChevronRight size={14} />
        </button>
      </div>

      {/* VersePopover */}
      {versePopover && (
        <VersePopover
          reference={versePopover.ref}
          anchorEl={versePopover.anchor}
          siblings={versePopover.siblings}
          onClose={() => setVersePopover(null)}
          onNavigate={(ref) =>
            setVersePopover((prev) =>
              prev ? { ...prev, ref } : null
            )
          }
        />
      )}
    </div>
  );

  // Mobile: bottom sheet overlay
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col justify-end">
        {/* Backdrop */}
        <div
          className="absolute inset-0"
          style={{ background: "rgba(0,0,0,0.4)" }}
        />
        {/* Sheet */}
        <div
          className="relative rounded-t-[16px] flex flex-col animate-slide-up"
          style={{
            background: "#1a1610",
            maxHeight: "88vh",
            minHeight: "60vh",
          }}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div
              className="w-10 h-[5px] rounded-full"
              style={{ background: "#5c5347" }}
            />
          </div>
          {content}
        </div>
      </div>
    );
  }

  // Desktop: side panel
  return (
    <div
      className="flex flex-col h-full w-[480px] shrink-0 border-l animate-slide-in-right"
      style={{
        background: "#1a1610",
        borderColor: "rgba(196,164,106,0.1)",
      }}
    >
      {content}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mt-7 mb-3">
      <div className="h-px flex-1" style={{ background: "rgba(92,83,71,0.3)" }} />
      <span
        className="text-[10px] font-sans font-bold tracking-[2px] uppercase"
        style={{ color: "#5c5347" }}
      >
        {children}
      </span>
      <div className="h-px flex-1" style={{ background: "rgba(92,83,71,0.3)" }} />
    </div>
  );
}
