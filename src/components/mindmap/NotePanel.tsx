import { useState, useCallback, useRef, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, BookOpen, ChevronDown, Sparkles, Loader2, FileText, Flame, Megaphone, Check } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import type { KeyConcept, VerseRef, ConceptConnection, KeyPointDeep } from "./types";
import { getCategoryColor, getCategoryName, verseRefString } from "./types";
import VersePopover from "./VersePopover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  onQuiz?: (conceptId: string) => void;
}

export default function NotePanel({
  concept,
  concepts,
  currentIndex,
  onNavigate,
  onClose,
  onQuiz,
}: NotePanelProps) {
  const isMobile = useIsMobile();
  const [versePopover, setVersePopover] = useState<{
    ref: string;
    anchor: HTMLElement;
    siblings: string[];
  } | null>(null);

  // ── Deep study (Level 3) state ──
  const [deepLoading, setDeepLoading] = useState(false);
  const [deepData, setDeepData] = useState<{
    theological_analysis?: string;
    connections?: ConceptConnection[];
    reflection_questions?: string[];
  } | null>(null);
  const [deepOpen, setDeepOpen] = useState(false);
  const [transformLoading, setTransformLoading] = useState<string | null>(null);
  const [transformOpen, setTransformOpen] = useState(false);

  // Reset deep state when navigating to another concept
  useEffect(() => {
    setDeepData(null);
    setDeepOpen(false);
    setTransformOpen(false);
  }, [concept?.id]);

  const allVerses: string[] = concept
    ? [
        ...((concept.expanded_note?.verses || []).map(verseRefString)),
        ...(concept.bible_refs || []),
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
  const topicConcepts = concepts.filter((c) => !c.type || c.type === "topic");
  const topicIndex = topicConcepts.findIndex((c) => c.id === concept.id);
  const total = topicConcepts.length;

  const coreIdea = note?.core_idea || concept.coreIdea || "";
  const explanation = note?.explanation || "";
  const detailedExplanation = note?.detailed_explanation || "";
  const historicalContext = note?.historical_context || "";
  const examples = note?.examples || [];
  const keyPoints = note?.key_points || note?.affirmations || concept.keyPoints || [];
  const keyPointsDeep: KeyPointDeep[] = note?.key_points_deep || [];
  const subsections = note?.subsections || [];
  const versesRich: VerseRef[] = (note?.verses || []).map(v =>
    typeof v === "string" ? { ref: v } : v
  );
  const legacyVerses = !note?.verses?.length ? (concept.bible_refs || []).map(r => ({ ref: r } as VerseRef)) : [];
  const verses: VerseRef[] = versesRich.length > 0 ? versesRich : legacyVerses;
  const authorQuotes = note?.author_quotes || [];
  const application = note?.application || concept.practicalApplication || "";
  const impactPhrase = note?.impact_phrase || concept.impactPhrase || "";
  const sourceSlides = concept.source_slides || (concept.page_ref ? [concept.page_ref] : []);
  const slideRange = formatSlideRange(sourceSlides);

  // Use cached deep data from concept if available
  const effectiveDeep = deepData || (note?.theological_analysis ? {
    theological_analysis: note.theological_analysis,
    connections: note.connections || [],
    reflection_questions: note.reflection_questions || [],
  } : null);

  const peerTitles = topicConcepts.filter(c => c.id !== concept.id).map(c => c.title);

  const loadDeep = async () => {
    if (effectiveDeep || deepLoading) {
      setDeepOpen(true);
      return;
    }
    setDeepLoading(true);
    setDeepOpen(true);
    try {
      const sourceBody = [
        coreIdea,
        detailedExplanation,
        historicalContext,
        application,
        ...keyPoints,
        ...examples,
        ...verses.map(v => v.ref + (v.context ? `: ${v.context}` : "")),
      ].filter(Boolean).join("\n");
      const { data, error } = await supabase.functions.invoke("deepen-concept", {
        body: { mode: "deep", title: concept.title, summary: coreIdea, body: sourceBody, peers: peerTitles },
      });
      if (error) throw error;
      setDeepData(data);
    } catch (e: any) {
      toast.error(e?.message || "Falha ao carregar estudo profundo");
      setDeepOpen(false);
    } finally {
      setDeepLoading(false);
    }
  };

  const transformAndSave = async (mode: "study_card" | "devotional" | "sermon_outline") => {
    setTransformLoading(mode);
    try {
      const body = [coreIdea, detailedExplanation, application, ...keyPoints,
        ...verses.map(v => v.ref + (v.context ? `: ${v.context}` : ""))].filter(Boolean).join("\n");
      const { data, error } = await supabase.functions.invoke("deepen-concept", {
        body: { mode, title: concept.title, summary: coreIdea, body },
      });
      if (error) throw error;
      const md: string = data?.markdown || "";
      if (!md) throw new Error("Resposta vazia");

      // Save into Caderno (localStorage shape used by NotebookList)
      const STORAGE_KEY = "fascinacao_study_notes";
      const labels: Record<string, string> = {
        study_card: "Cartão de Estudo",
        devotional: "Devocional",
        sermon_outline: "Esboço de Sermão",
      };
      const categories: Record<string, string> = {
        study_card: "Teologia",
        devotional: "Devocionais",
        sermon_outline: "Sermões",
      };
      const now = new Date().toISOString();
      const newNote = {
        id: Date.now().toString(),
        title: `${labels[mode]} — ${concept.title}`,
        content: md,
        category: categories[mode],
        wordCount: md.split(/\s+/).length,
        createdAt: now,
        updatedAt: now,
      };
      try {
        const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        localStorage.setItem(STORAGE_KEY, JSON.stringify([newNote, ...existing]));
      } catch {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([newNote]));
      }
      toast.success(`${labels[mode]} salvo no Caderno`, { description: concept.title });
    } catch (e: any) {
      toast.error(e?.message || "Falha na transformação");
    } finally {
      setTransformLoading(null);
    }
  };

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
          <div className="w-2 h-2 rounded-full" style={{ background: catColor }} />
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
        <div className="flex items-center gap-1">
          {onQuiz && (
            <button
              onClick={() => onQuiz(concept.id)}
              className="px-2.5 py-1.5 rounded-lg text-[10px] font-sans font-bold tracking-wide transition-all active:scale-95"
              style={{ background: "rgba(196,164,106,0.1)", color: "#c4a46a", border: "1px solid rgba(196,164,106,0.15)" }}
            >
              🧠 Quiz
            </button>
          )}
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors hover:bg-white/5">
            <X size={18} style={{ color: "#8a7d6a" }} />
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-0">
        <div className="flex items-baseline gap-3 mb-2 flex-wrap">
          <h2 className="font-display font-bold" style={{ color: "#ede4d3", fontSize: isMobile ? 24 : 32, lineHeight: 1.2 }}>
            {concept.title}
          </h2>
          {slideRange && (
            <span className="text-[10px] font-sans font-bold tracking-[1.5px] uppercase px-2 py-1 rounded"
              style={{ background: "rgba(196,164,106,0.1)", color: "#c4a46a" }}>
              {slideRange}
            </span>
          )}
        </div>

        {concept.summary && (
          <p className="font-body text-[13px] italic mb-5" style={{ color: "#8a7d6a", lineHeight: 1.5 }}>
            {concept.summary}
          </p>
        )}

        {concept.quotes && concept.quotes.length > 0 && (
          <div className="mb-6 space-y-2">
            {concept.quotes.map((q, i) => (
              <blockquote key={i} className="font-body italic text-[14px] pl-4 py-1"
                style={{ color: "#c4b89e", borderLeft: "2px solid rgba(196,164,106,0.4)", lineHeight: 1.55 }}>
                "{q}"
              </blockquote>
            ))}
          </div>
        )}

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
            <p className="font-body text-[15px] italic" style={{ color: "#ede4d3", lineHeight: 1.6 }}>
              {coreIdea}
            </p>
          </div>
        )}

        {detailedExplanation && (
          <>
            <SectionLabel>EXPLICAÇÃO</SectionLabel>
            <div className="mb-6">
              {detailedExplanation.split("\n\n").map((para, i) => (
                <p key={i} className="font-body text-[15px] mb-3" style={{ color: "#d4c8b0", lineHeight: 1.75 }}>
                  <InlineVerseText text={para} onVerseClick={handleVerseClick} />
                </p>
              ))}
            </div>
          </>
        )}

        {historicalContext && (
          <>
            <SectionLabel>CONTEXTO</SectionLabel>
            <div className="mb-6 rounded-lg p-4" style={{ background: "rgba(123,163,201,0.05)", borderLeft: "2px solid rgba(123,163,201,0.4)" }}>
              <p className="font-body text-[14.5px]" style={{ color: "#c4b89e", lineHeight: 1.7 }}>
                <InlineVerseText text={historicalContext} onVerseClick={handleVerseClick} />
              </p>
            </div>
          </>
        )}

        {examples.length > 0 && (
          <>
            <SectionLabel>EXEMPLOS</SectionLabel>
            <ul className="space-y-3 mb-6">
              {examples.map((ex, i) => (
                <li key={i} className="flex gap-3 items-start rounded-md px-3 py-2" style={{ background: "rgba(196,164,106,0.04)" }}>
                  <span className="font-display text-[13px] font-bold mt-0.5" style={{ color: "#c4a46a" }}>
                    {i + 1}.
                  </span>
                  <p className="font-body text-[14px]" style={{ color: "#d4c8b0", lineHeight: 1.6 }}>
                    <InlineVerseText text={ex} onVerseClick={handleVerseClick} />
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}

        {keyPoints.length > 0 && (
          <>
            <SectionLabel>PONTOS PRINCIPAIS</SectionLabel>
            <ul className="space-y-2 mb-6 pl-1">
              {keyPoints.map((p, i) => {
                const deep = keyPointsDeep.find(kpd => kpd.point === p)?.detail;
                return (
                  <DeepKeyPoint
                    key={i}
                    point={p}
                    detail={deep}
                    onVerseClick={handleVerseClick}
                  />
                );
              })}
            </ul>
          </>
        )}

        {subsections.length > 0 && subsections.map((sub, i) => (
          <SubsectionBlock
            key={i}
            sub={sub}
            onVerseClick={handleVerseClick}
          />
        ))}

        {explanation && !keyPoints.length && (
          <>
            <SectionLabel>EXPLICAÇÃO</SectionLabel>
            <div className="mb-6">
              {explanation.split("\n\n").map((para, i) => (
                <p key={i} className="font-body text-[15px] mb-3" style={{ color: "#c4b89e", lineHeight: 1.75 }}>
                  <InlineVerseText text={para} onVerseClick={handleVerseClick} />
                </p>
              ))}
            </div>
          </>
        )}

        {verses.length > 0 && (
          <>
            <SectionLabel>VERSÍCULOS</SectionLabel>
            <div className="flex flex-wrap gap-2 mb-6">
              {verses.map((v, i) => (
                <button
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-[20px] transition-all group"
                  style={{
                    background: "rgba(123,163,201,0.06)",
                    border: "1px solid rgba(123,163,201,0.25)",
                    padding: "6px 12px",
                  }}
                  title={v.context ? `${v.context}${v.source_slide ? ` · Sl. ${v.source_slide}` : ""}` : undefined}
                  onClick={(e) => handleVerseClick(v.ref, e.currentTarget as HTMLElement)}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(123,163,201,0.14)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(123,163,201,0.06)";
                  }}
                >
                  <BookOpen size={12} style={{ color: "#7ba3c9" }} />
                  <span className="font-body italic text-[12.5px]" style={{ color: "#7ba3c9" }}>{v.ref}</span>
                  {v.source_slide && (
                    <span className="text-[9px] font-sans tracking-wider" style={{ color: "#5c5347" }}>
                      Sl.{v.source_slide}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {authorQuotes.length > 0 && (
          <>
            <SectionLabel>CITAÇÕES</SectionLabel>
            <div className="space-y-3 mb-6">
              {authorQuotes.map((q, i) => (
                <div key={i} className="rounded-r-lg" style={{
                  borderLeft: "2px solid rgba(196,164,106,0.4)",
                  padding: "10px 16px",
                  background: "rgba(196,164,106,0.03)",
                }}>
                  <p className="font-body italic text-[14px]" style={{ color: "#d4b87a", lineHeight: 1.6 }}>
                    "{q.text}"
                  </p>
                  <div className="mt-1.5 flex items-baseline gap-2">
                    <span className="text-[11px] font-sans font-semibold" style={{ color: "#8a7d6a" }}>
                      — {q.author}
                    </span>
                    {q.source_slide && (
                      <span className="text-[10px] font-sans tracking-wider" style={{ color: "#5c5347" }}>
                        Sl. {q.source_slide}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {application && (
          <>
            <SectionLabel>APLICAÇÃO</SectionLabel>
            <div className="mb-6">
              {application.split("\n\n").map((para, i) => (
                <p key={i} className="font-body text-[15px] mb-3" style={{ color: "#c4b89e", lineHeight: 1.75 }}>
                  <InlineVerseText text={para} onVerseClick={handleVerseClick} />
                </p>
              ))}
            </div>
          </>
        )}

        {impactPhrase && (
          <>
            <SectionLabel>FRASE DE IMPACTO</SectionLabel>
            <div
              className="mb-6 text-center relative"
              style={{
                background: "linear-gradient(135deg, rgba(196,164,106,0.1), rgba(196,164,106,0.04))",
                borderTop: "1px solid rgba(196,164,106,0.15)",
                borderBottom: "1px solid rgba(196,164,106,0.15)",
                padding: "18px 24px",
              }}
            >
              <span
                className="absolute top-2 left-4 font-body text-[30px] select-none"
                style={{ color: "rgba(196,164,106,0.2)", lineHeight: 1 }}
              >"</span>
              <p
                className="font-body font-semibold"
                style={{ color: "#d4b87a", fontSize: isMobile ? 15 : 17, lineHeight: 1.5 }}
              >
                {impactPhrase}
              </p>
              <span
                className="absolute bottom-1 right-4 font-body text-[30px] select-none"
                style={{ color: "rgba(196,164,106,0.2)", lineHeight: 1 }}
              >"</span>
            </div>
          </>
        )}

        {/* ── Deep Study (Level 3) ── */}
        <DeepStudyBlock
          isOpen={deepOpen}
          isLoading={deepLoading}
          onToggle={() => (effectiveDeep ? setDeepOpen(o => !o) : loadDeep())}
          data={effectiveDeep}
          onVerseClick={handleVerseClick}
        />

        {/* ── Transform actions ── */}
        <TransformBlock
          open={transformOpen}
          onToggle={() => setTransformOpen(o => !o)}
          loading={transformLoading}
          onTransform={transformAndSave}
        />

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
          <ChevronLeft size={14} /> Anterior
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
          Próximo <ChevronRight size={14} />
        </button>
      </div>

      {versePopover && (
        <VersePopover
          reference={versePopover.ref}
          anchorEl={versePopover.anchor}
          siblings={versePopover.siblings}
          onClose={() => setVersePopover(null)}
          onNavigate={(ref) => setVersePopover((prev) => (prev ? { ...prev, ref } : null))}
        />
      )}
    </div>
  );

  // Mobile: bottom sheet with drag-to-dismiss + swipe navigation
  if (isMobile) {
    return (
      <MobileBottomSheet onClose={onClose} onSwipeLeft={() => canNext && onNavigate(currentIndex + 1)} onSwipeRight={() => canPrev && onNavigate(currentIndex - 1)}>
        {content}
      </MobileBottomSheet>
    );
  }

  // Desktop: side panel
  return (
    <div
      className="flex flex-col h-full w-[480px] shrink-0 border-l animate-slide-in-right"
      style={{ background: "#1a1610", borderColor: "rgba(196,164,106,0.1)" }}
    >
      {content}
    </div>
  );
}

// ── Mobile Bottom Sheet with drag-to-dismiss ──

function MobileBottomSheet({
  children,
  onClose,
  onSwipeLeft,
  onSwipeRight,
}: {
  children: React.ReactNode;
  onClose: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startY: number; startX: number; currentY: number; isDragging: boolean }>({
    startY: 0, startX: 0, currentY: 0, isDragging: false,
  });

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    dragRef.current = { startY: touch.clientY, startX: touch.clientX, currentY: touch.clientY, isDragging: true };
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragRef.current.isDragging || !sheetRef.current) return;
    const touch = e.touches[0];
    const deltaY = touch.clientY - dragRef.current.startY;
    dragRef.current.currentY = touch.clientY;
    if (deltaY > 0) {
      sheetRef.current.style.transform = `translateY(${deltaY}px)`;
      sheetRef.current.style.transition = "none";
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!dragRef.current.isDragging || !sheetRef.current) return;
    const deltaY = dragRef.current.currentY - dragRef.current.startY;
    const deltaX = dragRef.current.currentY - dragRef.current.startY;
    dragRef.current.isDragging = false;

    if (deltaY > 120) {
      sheetRef.current.style.transition = "transform 0.3s ease-out";
      sheetRef.current.style.transform = "translateY(100%)";
      setTimeout(onClose, 300);
    } else {
      sheetRef.current.style.transition = "transform 0.2s ease-out";
      sheetRef.current.style.transform = "translateY(0)";
    }
  }, [onClose]);

  // Horizontal swipe for navigation (tracked on body, not handle)
  const bodyRef = useRef<HTMLDivElement>(null);
  const swipeRef = useRef<{ startX: number; startY: number }>({ startX: 0, startY: 0 });

  const onBodyTouchStart = useCallback((e: React.TouchEvent) => {
    swipeRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY };
  }, []);

  const onBodyTouchEnd = useCallback((e: React.TouchEvent) => {
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const dx = endX - swipeRef.current.startX;
    const dy = endY - swipeRef.current.startY;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) onSwipeLeft?.();
      else onSwipeRight?.();
    }
  }, [onSwipeLeft, onSwipeRight]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.4)" }} onClick={onClose} />
      <div
        ref={sheetRef}
        className="relative rounded-t-[16px] flex flex-col animate-slide-up"
        style={{ background: "#1a1610", maxHeight: "88vh", minHeight: "60vh" }}
      >
        {/* Drag handle */}
        <div
          className="flex justify-center pt-3 pb-1 shrink-0 cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-10 h-[5px] rounded-full" style={{ background: "#5c5347" }} />
        </div>
        {/* Swipeable body */}
        <div
          ref={bodyRef}
          className="flex-1 min-h-0 overflow-hidden"
          onTouchStart={onBodyTouchStart}
          onTouchEnd={onBodyTouchEnd}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children, slideRef }: { children: React.ReactNode; slideRef?: string }) {
  return (
    <div className="flex items-center gap-3 mt-7 mb-3">
      <div className="h-px flex-1" style={{ background: "rgba(92,83,71,0.3)" }} />
      <span className="text-[10px] font-sans font-bold tracking-[2px] uppercase" style={{ color: "#5c5347" }}>
        {children}
      </span>
      {slideRef && (
        <span className="text-[10px] font-sans tracking-[1px]" style={{ color: "#5c5347" }}>
          {slideRef}
        </span>
      )}
      <div className="h-px flex-1" style={{ background: "rgba(92,83,71,0.3)" }} />
    </div>
  );
}

function formatSlideRange(slides: number[]): string {
  if (!slides || slides.length === 0) return "";
  const sorted = [...slides].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  if (min === max) return `Sl. ${min}`;
  return `Sl. ${min}-${max}`;
}

function SubsectionBlock({
  sub,
  onVerseClick,
}: {
  sub: import("./types").NoteSubsection;
  onVerseClick: (ref: string, el: HTMLElement) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const range = formatSlideRange(sub.source_slides || []);
  const visiblePoints = expanded ? sub.points : sub.points.slice(0, 2);

  return (
    <div className="mb-5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-baseline justify-between gap-2 mb-2 group"
      >
        <span className="flex items-center gap-1.5">
          <ChevronDown
            size={13}
            style={{
              color: "#c4a46a",
              transform: expanded ? "rotate(0deg)" : "rotate(-90deg)",
              transition: "transform 0.18s ease",
            }}
          />
          <span className="font-display text-[14px] font-semibold uppercase tracking-wide" style={{ color: "#c4a46a" }}>
            {sub.subtitle}
          </span>
        </span>
        {range && (
          <span className="text-[10px] font-sans tracking-[1px]" style={{ color: "#5c5347" }}>
            {range}
          </span>
        )}
      </button>
      <ul className="space-y-1.5 pl-4" style={{ borderLeft: "1px solid rgba(196,164,106,0.1)" }}>
        {visiblePoints.map((p, i) => (
          <li key={i} className="flex gap-2 items-start pl-2">
            <span className="mt-2 w-1 h-1 rounded-full shrink-0" style={{ background: "#8a7d6a" }} />
            <p className="font-body text-[14px]" style={{ color: "#c4b89e", lineHeight: 1.55 }}>
              <InlineVerseText text={p} onVerseClick={onVerseClick} />
            </p>
          </li>
        ))}
        {!expanded && sub.points.length > 2 && (
          <li className="pl-2 text-[11px] font-sans" style={{ color: "#5c5347" }}>
            +{sub.points.length - 2} pontos…
          </li>
        )}
      </ul>
    </div>
  );
}

// ── Key point with optional progressive depth (Level 2) ──
function DeepKeyPoint({
  point,
  detail,
  onVerseClick,
}: {
  point: string;
  detail?: string;
  onVerseClick: (ref: string, el: HTMLElement) => void;
}) {
  const [open, setOpen] = useState(false);
  const hasDetail = !!detail && detail.trim().length > 0;
  return (
    <li className="flex flex-col gap-1.5">
      <button
        type="button"
        disabled={!hasDetail}
        onClick={() => hasDetail && setOpen(o => !o)}
        className="flex gap-2.5 items-start text-left w-full group"
        style={{ cursor: hasDetail ? "pointer" : "default" }}
      >
        <span
          className="mt-2 w-1 h-1 rounded-full shrink-0"
          style={{ background: hasDetail && open ? "#d4b87a" : "#c4a46a" }}
        />
        <p className="font-body text-[14.5px] flex-1" style={{ color: "#d4c8b0", lineHeight: 1.55 }}>
          <InlineVerseText text={point} onVerseClick={onVerseClick} />
          {hasDetail && (
            <ChevronDown
              size={12}
              className="inline-block ml-1.5 align-middle transition-transform"
              style={{
                color: "#8a7d6a",
                transform: open ? "rotate(0deg)" : "rotate(-90deg)",
              }}
            />
          )}
        </p>
      </button>
      {hasDetail && open && (
        <p
          className="font-body text-[13.5px] ml-4 pl-3"
          style={{
            color: "#a89880",
            lineHeight: 1.65,
            borderLeft: "1px solid rgba(196,164,106,0.2)",
          }}
        >
          <InlineVerseText text={detail!} onVerseClick={onVerseClick} />
        </p>
      )}
    </li>
  );
}

// ── Deep Study (Level 3) ──
function DeepStudyBlock({
  isOpen,
  isLoading,
  onToggle,
  data,
  onVerseClick,
}: {
  isOpen: boolean;
  isLoading: boolean;
  onToggle: () => void;
  data: { theological_analysis?: string; connections?: ConceptConnection[]; reflection_questions?: string[] } | null;
  onVerseClick: (ref: string, el: HTMLElement) => void;
}) {
  return (
    <div className="mb-4 mt-2">
      <button
        onClick={onToggle}
        disabled={isLoading}
        className="w-full flex items-center justify-between rounded-xl px-4 py-3 transition-all"
        style={{
          background: isOpen
            ? "linear-gradient(135deg, rgba(196,164,106,0.12), rgba(196,164,106,0.04))"
            : "rgba(196,164,106,0.06)",
          border: "1px solid rgba(196,164,106,0.2)",
        }}
      >
        <span className="flex items-center gap-2">
          {isLoading ? (
            <Loader2 size={14} className="animate-spin" style={{ color: "#c4a46a" }} />
          ) : (
            <Sparkles size={14} style={{ color: "#c4a46a" }} />
          )}
          <span className="font-display text-[13.5px] font-bold tracking-wide uppercase" style={{ color: "#d4b87a" }}>
            Estudo Profundo
          </span>
          {!data && !isLoading && (
            <span className="text-[10.5px] font-sans tracking-wide" style={{ color: "#8a7d6a" }}>
              · Aprofundar com IA
            </span>
          )}
        </span>
        <ChevronDown
          size={14}
          style={{
            color: "#c4a46a",
            transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
            transition: "transform 0.2s",
          }}
        />
      </button>

      {isOpen && (
        <div className="mt-4 space-y-5 px-1">
          {isLoading && (
            <p className="text-[13px] font-body italic text-center py-6" style={{ color: "#8a7d6a" }}>
              Gerando análise teológica…
            </p>
          )}

          {data?.theological_analysis && (
            <div>
              <p className="text-[10px] font-sans font-bold tracking-[2px] uppercase mb-2" style={{ color: "#5c5347" }}>
                Análise Teológica
              </p>
              {data.theological_analysis.split("\n\n").map((para, i) => (
                <p key={i} className="font-body text-[14.5px] mb-2.5" style={{ color: "#d4c8b0", lineHeight: 1.7 }}>
                  <InlineVerseText text={para} onVerseClick={onVerseClick} />
                </p>
              ))}
            </div>
          )}

          {data?.connections && data.connections.length > 0 && (
            <div>
              <p className="text-[10px] font-sans font-bold tracking-[2px] uppercase mb-2" style={{ color: "#5c5347" }}>
                Conexões
              </p>
              <div className="space-y-1.5">
                {data.connections.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-lg px-3 py-2"
                    style={{ background: "rgba(176,141,181,0.06)", border: "1px solid rgba(176,141,181,0.2)" }}
                  >
                    <span className="text-[11px] font-sans tracking-wide" style={{ color: "#b08db5" }}>
                      {c.relation}
                    </span>
                    <span className="text-[10px]" style={{ color: "#5c5347" }}>→</span>
                    <span className="font-body text-[13.5px]" style={{ color: "#d4c8b0" }}>
                      {c.concept_title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data?.reflection_questions && data.reflection_questions.length > 0 && (
            <div>
              <p className="text-[10px] font-sans font-bold tracking-[2px] uppercase mb-2" style={{ color: "#5c5347" }}>
                Perguntas Reflexivas
              </p>
              <ul className="space-y-2">
                {data.reflection_questions.map((q, i) => (
                  <li
                    key={i}
                    className="flex gap-2 items-start rounded-md px-3 py-2"
                    style={{ background: "rgba(106,156,138,0.05)", borderLeft: "2px solid rgba(106,156,138,0.4)" }}
                  >
                    <span className="font-display text-[12px] font-bold mt-0.5" style={{ color: "#6a9c8a" }}>
                      ?
                    </span>
                    <p className="font-body italic text-[14px]" style={{ color: "#c4b89e", lineHeight: 1.55 }}>
                      {q}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Transform into … ──
function TransformBlock({
  open,
  onToggle,
  loading,
  onTransform,
}: {
  open: boolean;
  onToggle: () => void;
  loading: string | null;
  onTransform: (mode: "study_card" | "devotional" | "sermon_outline") => void;
}) {
  const opts = [
    { mode: "study_card" as const, icon: FileText, label: "Cartão de Estudo", desc: "Resumo denso para revisão" },
    { mode: "devotional" as const, icon: Flame, label: "Devocional", desc: "Reflexão + oração + compromisso" },
    { mode: "sermon_outline" as const, icon: Megaphone, label: "Esboço de Sermão", desc: "3 pontos com aplicação" },
  ];
  return (
    <div className="mb-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between rounded-xl px-4 py-3 transition-all"
        style={{
          background: open ? "rgba(123,163,201,0.12)" : "rgba(123,163,201,0.06)",
          border: "1px solid rgba(123,163,201,0.2)",
        }}
      >
        <span className="flex items-center gap-2">
          <Sparkles size={14} style={{ color: "#7ba3c9" }} />
          <span className="font-display text-[13.5px] font-bold tracking-wide uppercase" style={{ color: "#7ba3c9" }}>
            Transformar em…
          </span>
        </span>
        <ChevronDown
          size={14}
          style={{
            color: "#7ba3c9",
            transform: open ? "rotate(0deg)" : "rotate(-90deg)",
            transition: "transform 0.2s",
          }}
        />
      </button>

      {open && (
        <div className="mt-3 grid gap-2">
          {opts.map(o => {
            const Icon = o.icon;
            const isLoading = loading === o.mode;
            return (
              <button
                key={o.mode}
                onClick={() => !loading && onTransform(o.mode)}
                disabled={!!loading}
                className="flex items-start gap-3 text-left rounded-lg px-3 py-3 transition-all disabled:opacity-40"
                style={{
                  background: "rgba(123,163,201,0.04)",
                  border: "1px solid rgba(123,163,201,0.15)",
                }}
              >
                <div
                  className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: "rgba(123,163,201,0.15)" }}
                >
                  {isLoading ? (
                    <Loader2 size={14} className="animate-spin" style={{ color: "#7ba3c9" }} />
                  ) : (
                    <Icon size={14} style={{ color: "#7ba3c9" }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-[13.5px] font-semibold" style={{ color: "#d4c8b0" }}>
                    {o.label}
                  </p>
                  <p className="font-body text-[11.5px] mt-0.5" style={{ color: "#8a7d6a", lineHeight: 1.4 }}>
                    {o.desc}
                  </p>
                </div>
                <Check size={12} style={{ color: "rgba(123,163,201,0.3)", marginTop: 6 }} />
              </button>
            );
          })}
          <p className="text-[11px] font-sans italic px-1 mt-1" style={{ color: "#5c5347" }}>
            Salvo automaticamente no Caderno após a geração.
          </p>
        </div>
      )}
    </div>
  );
}
