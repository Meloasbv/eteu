import { useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";
import { ArrowLeft, Download, BookOpen, ChevronUp, ChevronDown, Share2, Search, X, Play, StickyNote } from "lucide-react";
import type { AnalysisResult, KeyConcept } from "@/components/mindmap/types";
import StudySummary from "./StudySummary";
import StudySection from "./StudySection";
import StudyQuiz from "./StudyQuiz";
import VersePopover from "@/components/mindmap/VersePopover";
import { exportStudyGuidePDF } from "@/lib/exportStudyGuide";
import ShareDialog from "@/components/mindmap/ShareDialog";
import { supabase } from "@/integrations/supabase/client";

const PresentationMode = lazy(() => import("@/components/mindmap/PresentationMode"));

interface Props {
  analysis: AnalysisResult;
  onBack: () => void;
  activeSectionId?: string | null;
  onActiveSectionChange?: (id: string | null) => void;
  /** Map id for sharing. If omitted, share button is hidden. */
  mapId?: string | null;
  /** Called when the dialog needs to ensure the map is saved (returns the id). */
  onEnsureSavedForShare?: () => Promise<string | null>;
  /** When true, render the shared/read-only experience: floating notes (localStorage), search, present. */
  sharedMode?: boolean;
  /** Slug used to namespace localStorage notes in shared mode. */
  sharedSlug?: string;
}

interface GroupedConcept {
  /** Stable id used for DOM/scroll. */
  id: string;
  /** Display title (the shared/normalized title). */
  title: string;
  /** Original concepts grouped under this title. */
  members: KeyConcept[];
}

/** Group adjacent (by index) concepts that share the same normalized title. */
function groupByTitle(concepts: KeyConcept[]): GroupedConcept[] {
  const groups: GroupedConcept[] = [];
  const norm = (t: string) => (t || "").trim().toLowerCase().replace(/\s+/g, " ");
  for (const c of concepts) {
    const key = norm(c.title);
    const last = groups[groups.length - 1];
    if (last && norm(last.title) === key) {
      last.members.push(c);
    } else {
      groups.push({ id: c.id, title: c.title, members: [c] });
    }
  }
  return groups;
}

/** Track which person names already appeared, so we render each only on first occurrence. */
function buildPersonSeen(groups: GroupedConcept[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  const seen = new Set<string>();
  for (const g of groups) {
    for (const m of g.members) {
      const allowed = new Set<string>();
      const people = m.expanded_note?.key_people || [];
      for (const p of people) {
        const key = (p.name || "").trim().toLowerCase();
        if (!key) continue;
        if (!seen.has(key)) {
          seen.add(key);
          allowed.add(key);
        }
      }
      map.set(m.id, allowed);
    }
  }
  return map;
}

export default function StudyGuide({
  analysis,
  onBack,
  activeSectionId,
  onActiveSectionChange,
  mapId,
  onEnsureSavedForShare,
  sharedMode = false,
  sharedSlug,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [allOpen, setAllOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareState, setShareState] = useState<{ isPublic: boolean; slug: string | null }>({
    isPublic: false,
    slug: null,
  });
  const [presenting, setPresenting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [verseQuery, setVerseQuery] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [popover, setPopover] = useState<{ ref: string; el: HTMLElement } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const concepts = analysis.key_concepts || [];
  const groups = useMemo(() => groupByTitle(concepts), [concepts]);
  const personSeen = useMemo(() => buildPersonSeen(groups), [groups]);

  // Quick-search filter (matches title, summary, core_idea, key_points, subsections)
  const matches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    const set = new Set<string>();
    const test = (s?: string | null) => !!s && s.toLowerCase().includes(q);
    for (const g of groups) {
      let hit = false;
      for (const m of g.members) {
        if (test(m.title) || test(m.summary)) hit = true;
        const note = m.expanded_note;
        if (note) {
          if (test(note.core_idea) || test(note.application) || test(note.impact_phrase) || test(note.analogy)) hit = true;
          (note.key_points || []).forEach(p => { if (test(p)) hit = true; });
          (note.subsections || []).forEach(s => {
            if (test(s.subtitle)) hit = true;
            (s.points || []).forEach(p => { if (test(p)) hit = true; });
          });
          (note.stories || []).forEach(s => { if (test(s.title) || test(s.narrative)) hit = true; });
          (note.author_quotes || []).forEach(qu => { if (test(qu.text) || test(qu.author)) hit = true; });
          (note.key_people || []).forEach(p => { if (test(p.name) || test(p.role)) hit = true; });
        }
      }
      if (hit) set.add(g.id);
    }
    return set;
  }, [searchQuery, groups]);

  const sectionId = (id: string) => `study-section-${id}`;

  // Load shared notes from localStorage
  useEffect(() => {
    if (!sharedMode || !sharedSlug) return;
    try {
      const v = localStorage.getItem(`shared-study-notes:${sharedSlug}`);
      if (v) setNotes(v);
    } catch {}
  }, [sharedMode, sharedSlug]);

  // Persist notes
  useEffect(() => {
    if (!sharedMode || !sharedSlug) return;
    const t = setTimeout(() => {
      try { localStorage.setItem(`shared-study-notes:${sharedSlug}`, notes); } catch {}
    }, 400);
    return () => clearTimeout(t);
  }, [notes, sharedMode, sharedSlug]);

  // Auto-expand search hits
  useEffect(() => {
    if (matches && matches.size > 0) {
      setExpanded(prev => {
        const next = new Set(prev);
        matches.forEach(id => next.add(id));
        return next;
      });
    }
  }, [matches]);

  // Load share state when dialog opens
  useEffect(() => {
    if (!shareOpen || !mapId) return;
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("mind_maps")
        .select("study_notes")
        .eq("id", mapId)
        .maybeSingle();
      if (!alive) return;
      const sn = (data?.study_notes as Record<string, unknown> | null) ?? {};
      setShareState({
        isPublic: Boolean((sn as any).is_public),
        slug: ((sn as any).public_slug as string | null) ?? null,
      });
    })();
    return () => { alive = false; };
  }, [shareOpen, mapId]);

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
    setExpanded(new Set(groups.map(g => g.id)));
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

  // Verse click: open popover (works in shared & app modes)
  const openVersePopover = (ref: string, el: HTMLElement) => {
    setPopover({ ref, el });
  };

  // Submit verse search → open popover at the search input
  const verseInputRef = useRef<HTMLInputElement>(null);
  const handleVerseSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = verseQuery.trim();
    if (!q) return;
    if (verseInputRef.current) {
      openVersePopover(q, verseInputRef.current);
    }
  };

  const totalDates = useMemo(
    () => concepts.reduce((acc, c) => acc + (c.expanded_note?.key_dates?.length || 0), 0),
    [concepts],
  );
  const totalPeople = useMemo(
    () => concepts.reduce((acc, c) => acc + (c.expanded_note?.key_people?.length || 0), 0),
    [concepts],
  );

  if (presenting) {
    return (
      <Suspense fallback={<div className="h-screen w-screen" style={{ background: "#0f0d0a" }} />}>
        <PresentationMode analysis={analysis} onExit={() => setPresenting(false)} />
      </Suspense>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto" ref={containerRef}>
      {/* Header */}
      <div
        className="sticky top-0 z-10 backdrop-blur-md"
        style={{
          background: "hsl(var(--background) / 0.92)",
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

          <button
            onClick={() => setPresenting(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-ui transition-all hover:scale-105"
            style={{
              background: "hsl(var(--primary) / 0.1)",
              border: "1px solid hsl(var(--primary) / 0.3)",
              color: "hsl(var(--primary))",
            }}
            title="Apresentar"
          >
            <Play size={13} />
            <span className="hidden sm:inline">Apresentar</span>
          </button>

          {!sharedMode && mapId !== undefined && (
            <button
              onClick={() => setShareOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-ui transition-all hover:scale-105"
              style={{
                background: "hsl(var(--muted))",
                border: "1px solid hsl(var(--border))",
                color: "hsl(var(--foreground))",
              }}
              title="Compartilhar estudo"
            >
              <Share2 size={13} />
              <span className="hidden sm:inline">Compartilhar</span>
            </button>
          )}

          {!sharedMode && (
            <button
              onClick={() => exportStudyGuidePDF(analysis)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-ui transition-all hover:scale-105"
              style={{
                background: "hsl(var(--muted))",
                border: "1px solid hsl(var(--border))",
                color: "hsl(var(--foreground))",
              }}
              title="Exportar PDF"
            >
              <Download size={13} />
              <span className="hidden sm:inline">PDF</span>
            </button>
          )}

          {sharedMode && (
            <button
              onClick={() => setShowNotes(s => !s)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-ui transition-all hover:scale-105"
              style={{
                background: showNotes ? "hsl(var(--primary) / 0.15)" : "hsl(var(--muted))",
                border: `1px solid ${showNotes ? "hsl(var(--primary) / 0.4)" : "hsl(var(--border))"}`,
                color: showNotes ? "hsl(var(--primary))" : "hsl(var(--foreground))",
              }}
              title="Anotações"
            >
              <StickyNote size={13} />
              <span className="hidden sm:inline">Notas</span>
            </button>
          )}
        </div>

        {/* Search bars (sticky) — always visible in shared mode, optional in app */}
        <div className="max-w-3xl mx-auto px-4 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <label className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ background: "hsl(var(--muted) / 0.5)", border: "1px solid hsl(var(--border))" }}>
            <Search size={14} className="text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Pesquisar no estudo…"
              className="flex-1 bg-transparent outline-none text-[13px] font-body text-foreground placeholder:text-muted-foreground/60"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-muted-foreground hover:text-foreground">
                <X size={12} />
              </button>
            )}
          </label>
          <form onSubmit={handleVerseSearch} className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ background: "hsl(var(--muted) / 0.5)", border: "1px solid hsl(var(--border))" }}>
            <BookOpen size={14} className="text-primary/70" />
            <input
              ref={verseInputRef}
              type="text"
              value={verseQuery}
              onChange={e => setVerseQuery(e.target.value)}
              placeholder="Buscar versículo (ex: João 3:16)"
              className="flex-1 bg-transparent outline-none text-[13px] font-body text-foreground placeholder:text-muted-foreground/60"
            />
            {verseQuery && (
              <button type="button" onClick={() => setVerseQuery("")} className="text-muted-foreground hover:text-foreground">
                <X size={12} />
              </button>
            )}
          </form>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5 pb-32">
        {/* Meta */}
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground/70 font-ui mb-4">
          <span>{groups.length} {groups.length === 1 ? "seção" : "seções"}</span>
          {analysis.pdf_meta?.total_slides && (
            <span>· {analysis.pdf_meta.total_slides} slides</span>
          )}
          {totalDates > 0 && <span>· {totalDates} datas</span>}
          {totalPeople > 0 && <span>· {totalPeople} pessoas</span>}
          {matches && (
            <span className="ml-auto text-primary">{matches.size} resultado{matches.size === 1 ? "" : "s"}</span>
          )}
        </div>

        {/* Source audios (when the study was generated from recordings/MP3) */}
        {analysis.source_audios && analysis.source_audios.length > 0 && (
          <div
            className="rounded-2xl p-4 mb-6"
            style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
          >
            <p className="text-[10px] tracking-[3px] uppercase text-primary/60 font-ui mb-3">
              Áudio original
            </p>
            <div className="space-y-3">
              {analysis.source_audios.map((a, i) => (
                <div key={i}>
                  {a.label && (
                    <p className="text-[11px] font-ui text-muted-foreground mb-1.5">{a.label}</p>
                  )}
                  <audio controls src={a.url} className="w-full" preload="metadata" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary */}
        <StudySummary
          concepts={groups.map(g => g.members[0])}
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
              <><ChevronUp size={12} /> Colapsar tudo</>
            ) : (
              <><ChevronDown size={12} /> Expandir tudo</>
            )}
          </button>
        </div>

        {/* Sections */}
        <div className="space-y-2 divide-y" style={{ borderColor: "hsl(var(--border))" }}>
          {groups.map((g, i) => {
            const hidden = matches && !matches.has(g.id);
            if (hidden) return null;
            const isOpen = expanded.has(g.id);
            return (
              <div key={g.id} ref={el => (sectionRefs.current[g.id] = el)}>
                {g.members.map((m, mi) => (
                  <StudySection
                    key={m.id}
                    index={i}
                    concept={m}
                    expanded={isOpen}
                    onToggle={() => toggleSection(g.id)}
                    sectionId={mi === 0 ? sectionId(g.id) : `${sectionId(g.id)}-${mi}`}
                    active={activeSectionId === g.id}
                    onVerseClick={(ref, el) => openVersePopover(ref, el)}
                    showPeopleNames={personSeen.get(m.id) ?? new Set()}
                    isGroupedMember={mi > 0}
                    showAnalogy={mi === 0}
                  />
                ))}
              </div>
            );
          })}
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

      {/* Floating notes panel (shared mode) */}
      {sharedMode && showNotes && (
        <div
          className="fixed right-4 bottom-4 z-30 w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl shadow-2xl flex flex-col animate-fade-in"
          style={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            maxHeight: "60vh",
          }}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: "hsl(var(--border))" }}>
            <div className="flex items-center gap-1.5">
              <StickyNote size={12} className="text-primary" />
              <span className="text-[10px] tracking-[2px] uppercase font-ui text-primary">Minhas notas</span>
            </div>
            <button onClick={() => setShowNotes(false)} className="text-muted-foreground hover:text-foreground p-1">
              <X size={14} />
            </button>
          </div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Anote partes importantes do estudo… (salvo automaticamente neste dispositivo)"
            className="flex-1 resize-none bg-transparent outline-none p-3 text-[13px] font-body text-foreground placeholder:text-muted-foreground/50"
            style={{ minHeight: 200 }}
          />
          <div className="px-3 py-1.5 text-[9px] tracking-[1.5px] uppercase font-ui text-muted-foreground/60 border-t" style={{ borderColor: "hsl(var(--border))" }}>
            Salvo localmente · {notes.length} caracteres
          </div>
        </div>
      )}

      {/* Floating notes toggle button (when collapsed in shared mode) */}
      {sharedMode && !showNotes && (
        <button
          onClick={() => setShowNotes(true)}
          className="fixed right-4 bottom-4 z-30 w-12 h-12 rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          style={{
            background: "hsl(var(--primary))",
            color: "hsl(var(--primary-foreground))",
          }}
          title="Abrir anotações"
        >
          <StickyNote size={18} />
        </button>
      )}

      {popover && (
        <VersePopover
          reference={popover.ref}
          anchorEl={popover.el}
          siblings={[popover.ref]}
          onClose={() => setPopover(null)}
          onNavigate={(r) => setPopover(p => p ? { ...p, ref: r } : p)}
        />
      )}

      {shareOpen && (
        <ShareDialog
          mapId={mapId ?? null}
          title={analysis.main_theme || "Estudo"}
          isPublic={shareState.isPublic}
          publicSlug={shareState.slug}
          onClose={() => setShareOpen(false)}
          onUpdate={(isPublic, slug) => setShareState({ isPublic, slug })}
          onEnsureSaved={onEnsureSavedForShare}
        />
      )}
    </div>
  );
}
