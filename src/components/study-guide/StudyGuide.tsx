import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Download, Map, BookOpen, ChevronUp, ChevronDown } from "lucide-react";
import type { AnalysisResult } from "@/components/mindmap/types";
import StudySummary from "./StudySummary";
import StudySection from "./StudySection";
import StudyQuiz from "./StudyQuiz";
import { exportStudyGuidePDF } from "@/lib/exportStudyGuide";

interface Props {
  analysis: AnalysisResult;
  onBack: () => void;
  onSwitchToMap?: () => void;
  activeSectionId?: string | null;
  onActiveSectionChange?: (id: string | null) => void;
}

export default function StudyGuide({
  analysis,
  onBack,
  onSwitchToMap,
  activeSectionId,
  onActiveSectionChange,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [allOpen, setAllOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const concepts = analysis.key_concepts || [];
  const sectionId = (id: string) => `study-section-${id}`;

  // Open the active section by default
  useEffect(() => {
    if (activeSectionId) {
      setExpanded(prev => {
        if (prev.has(activeSectionId)) return prev;
        const next = new Set(prev);
        next.add(activeSectionId);
        return next;
      });
      const el = document.getElementById(sectionId(activeSectionId));
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activeSectionId]);

  const toggleSection = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    onActiveSectionChange?.(id);
  };

  const expandAll = () => {
    setAllOpen(true);
    setExpanded(new Set(concepts.map(c => c.id)));
  };

  const collapseAll = () => {
    setAllOpen(false);
    setExpanded(new Set());
  };

  const goToSection = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    onActiveSectionChange?.(id);
    requestAnimationFrame(() => {
      const el = document.getElementById(sectionId(id));
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const totalDates = useMemo(
    () => concepts.reduce((acc, c) => acc + (c.expanded_note?.key_dates?.length || 0), 0),
    [concepts],
  );
  const totalPeople = useMemo(
    () => concepts.reduce((acc, c) => acc + (c.expanded_note?.key_people?.length || 0), 0),
    [concepts],
  );

  return (
    <div className="h-full w-full overflow-y-auto" ref={containerRef}>
      {/* Header */}
      <div
        className="sticky top-0 z-10 backdrop-blur-md"
        style={{
          background: "hsl(var(--background) / 0.85)",
          borderBottom: "1px solid hsl(var(--border))",
        }}
      >
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
            title="Voltar"
          >
            <ArrowLeft size={18} className="text-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] tracking-[2px] uppercase text-primary/60 font-ui">
              Estudo Guiado
            </p>
            <h1 className="font-display text-base font-bold text-foreground truncate">
              {analysis.main_theme}
            </h1>
          </div>
          {onSwitchToMap && (
            <button
              onClick={onSwitchToMap}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-ui transition-all hover:scale-105"
              style={{
                background: "hsl(var(--muted))",
                border: "1px solid hsl(var(--border))",
                color: "hsl(var(--foreground))",
              }}
              title="Ver como mapa mental"
            >
              <Map size={13} /> Mapa
            </button>
          )}
          <button
            onClick={() => exportStudyGuidePDF(analysis)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-ui transition-all hover:scale-105"
            style={{
              background: "hsl(var(--primary) / 0.1)",
              border: "1px solid hsl(var(--primary) / 0.3)",
              color: "hsl(var(--primary))",
            }}
            title="Exportar PDF"
          >
            <Download size={13} />
            <span className="hidden sm:inline">PDF</span>
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5 pb-32">
        {/* Meta */}
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground/70 font-ui mb-4">
          <span>{concepts.length} seções</span>
          {analysis.pdf_meta?.total_slides && (
            <span>· {analysis.pdf_meta.total_slides} slides</span>
          )}
          {totalDates > 0 && <span>· {totalDates} datas</span>}
          {totalPeople > 0 && <span>· {totalPeople} pessoas</span>}
        </div>

        {/* Mobile: Mind Map toggle */}
        {onSwitchToMap && (
          <button
            onClick={onSwitchToMap}
            className="sm:hidden w-full mb-4 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-ui transition-all"
            style={{
              background: "hsl(var(--muted))",
              border: "1px solid hsl(var(--border))",
              color: "hsl(var(--foreground))",
            }}
          >
            <Map size={14} /> Ver como Mapa Mental
          </button>
        )}

        {/* Summary */}
        <StudySummary
          concepts={concepts}
          activeId={activeSectionId || null}
          onSelect={goToSection}
        />

        {/* Expand/collapse all */}
        <div className="flex justify-end mb-2">
          <button
            onClick={allOpen ? collapseAll : expandAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-ui text-muted-foreground hover:text-foreground transition-colors"
          >
            {allOpen ? (
              <>
                <ChevronUp size={12} /> Colapsar tudo
              </>
            ) : (
              <>
                <ChevronDown size={12} /> Expandir tudo
              </>
            )}
          </button>
        </div>

        {/* Sections */}
        <div className="space-y-2 divide-y" style={{ borderColor: "hsl(var(--border))" }}>
          {concepts.map((c, i) => (
            <div
              key={c.id}
              ref={el => (sectionRefs.current[c.id] = el)}
            >
              <StudySection
                index={i}
                concept={c}
                expanded={expanded.has(c.id)}
                onToggle={() => toggleSection(c.id)}
                sectionId={sectionId(c.id)}
                active={activeSectionId === c.id}
              />
            </div>
          ))}
        </div>

        {/* Quiz */}
        {analysis.quiz_questions && analysis.quiz_questions.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen size={14} className="text-primary/70" />
              <h2 className="font-display text-base font-bold text-foreground">
                Fixando o Conteúdo
              </h2>
              <span className="text-[10px] text-muted-foreground/60 font-ui ml-auto">
                {analysis.quiz_questions.length} perguntas
              </span>
            </div>
            <StudyQuiz questions={analysis.quiz_questions} />
          </div>
        )}
      </div>
    </div>
  );
}
