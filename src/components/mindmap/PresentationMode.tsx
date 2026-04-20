import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { X, ChevronLeft, ChevronRight, Play, Pause, BookOpen, Quote as QuoteIcon } from "lucide-react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  MarkerType,
} from "@xyflow/react";
import dagre from "dagre";
import type { AnalysisResult, KeyConcept, NoteSubsection, AuthorQuote, VerseRef, SlideSummary } from "./types";
import { getCategoryColor, getCategoryName, verseRefString } from "./types";
import RootNodeComp from "./nodes/RootNode";
import TopicCardComp from "./nodes/TopicCard";
import HighlightCardComp from "./nodes/HighlightCard";
import VerseCardComp from "./nodes/VerseCard";

const nodeTypes = {
  root: RootNodeComp,
  topicCard: TopicCardComp,
  highlightCard: HighlightCardComp,
  verseCard: VerseCardComp,
};

interface PresentationModeProps {
  analysis: AnalysisResult;
  onExit: () => void;
}

// ============ Graph (visual map behind the captions) ============
function buildPresentationGraph(analysis: AnalysisResult) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const rootId = "node-root";
  nodes.push({
    id: rootId,
    type: "root",
    position: { x: 0, y: 0 },
    data: { label: analysis.main_theme || analysis.hierarchy?.root?.label },
  });

  const topicConcepts = (analysis.key_concepts || []).filter(c => !c.type || c.type === "topic");

  topicConcepts.forEach((concept, i) => {
    const id = `topic-${concept.id || i}`;
    const catColor = getCategoryColor(concept.category);
    nodes.push({
      id,
      type: "topicCard",
      position: { x: 0, y: 0 },
      data: {
        label: concept.title,
        summary: concept.summary || concept.expanded_note?.core_idea,
        category: concept.category,
        hasNote: true,
        childCount: (concept.child_highlights || []).length,
        verseCount: (concept.expanded_note?.verses || []).length,
        nodeId: id,
        isKey: concept.is_key === true,
        pageRef: concept.page_ref,
      },
    });
    edges.push({
      id: `e-root-${id}`, source: rootId, target: id,
      style: { stroke: `${catColor}66`, strokeWidth: 1.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: `${catColor}99` },
    });
  });

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 70, ranksep: 110, marginx: 60, marginy: 60 });
  const sizeMap: Record<string, { w: number; h: number }> = {
    root: { w: 300, h: 90 },
    topicCard: { w: 280, h: 110 },
    highlightCard: { w: 220, h: 70 },
    verseCard: { w: 160, h: 40 },
  };
  nodes.forEach(n => {
    const s = sizeMap[n.type || "topicCard"];
    g.setNode(n.id, { width: s.w, height: s.h });
  });
  edges.forEach(e => g.setEdge(e.source, e.target));
  dagre.layout(g);
  const positioned = nodes.map(n => {
    const p = g.node(n.id);
    const s = sizeMap[n.type || "topicCard"];
    return { ...n, position: { x: p.x - s.w / 2, y: p.y - s.h / 2 } };
  });

  return { nodes: positioned, edges };
}

// ============ Tour: 1 stop por subsection (granular) ============
type TourStop =
  | { kind: "root"; nodeId: string }
  | { kind: "topic-intro"; nodeId: string; concept: KeyConcept; topicIndex: number }
  | { kind: "subsection"; nodeId: string; concept: KeyConcept; topicIndex: number; subsection: NoteSubsection; subIndex: number }
  | { kind: "verses"; nodeId: string; concept: KeyConcept; topicIndex: number; verses: (string | VerseRef)[] }
  | { kind: "quote"; nodeId: string; concept: KeyConcept; topicIndex: number; quote: AuthorQuote }
  | { kind: "slides-overview"; nodeId: string; slides: SlideSummary[] }
  | { kind: "slide-summary"; nodeId: string; slideSummary: SlideSummary; concept?: KeyConcept };

function buildTour(analysis: AnalysisResult): TourStop[] {
  const stops: TourStop[] = [{ kind: "root", nodeId: "node-root" }];
  const topics = (analysis.key_concepts || []).filter(c => !c.type || c.type === "topic");
  const topicById = new Map<string, KeyConcept>();
  topics.forEach((t, i) => topicById.set(t.id || `concept_${i + 1}`, t));

  topics.forEach((concept, i) => {
    const nodeId = `topic-${concept.id || i}`;
    // 1) Topic intro slide
    stops.push({ kind: "topic-intro", nodeId, concept, topicIndex: i });

    const note = concept.expanded_note;
    if (!note) return;

    // 2) Subsections (each one becomes a slide).
    // If no subsections but has key_points, synthesize ONE subsection so all bullets show.
    const subs = note.subsections && note.subsections.length > 0
      ? note.subsections
      : (note.key_points && note.key_points.length > 0
        ? [{ subtitle: "Pontos principais", points: note.key_points, source_slides: concept.source_slides } as NoteSubsection]
        : []);

    // If many key_points and no real subsections, split into chunks of 5 so each slide stays scannable
    const expandedSubs: NoteSubsection[] = [];
    subs.forEach(sub => {
      if (sub.points.length > 6) {
        for (let k = 0; k < sub.points.length; k += 5) {
          expandedSubs.push({
            subtitle: k === 0 ? sub.subtitle : `${sub.subtitle} (cont.)`,
            points: sub.points.slice(k, k + 5),
            source_slides: sub.source_slides,
          });
        }
      } else {
        expandedSubs.push(sub);
      }
    });

    expandedSubs.forEach((subsection, subIndex) => {
      stops.push({ kind: "subsection", nodeId, concept, topicIndex: i, subsection, subIndex });
    });

    // 3) Consolidated verses slide (if any)
    if (note.verses && note.verses.length > 0) {
      stops.push({ kind: "verses", nodeId, concept, topicIndex: i, verses: note.verses });
    }

    // 4) Each author quote becomes its own slide (impact moments)
    (note.author_quotes || []).forEach(quote => {
      stops.push({ kind: "quote", nodeId, concept, topicIndex: i, quote });
    });
  });

  // 5) Slide-by-slide coverage: ensure EVERY slide of the source PDF is represented.
  const slides = analysis.slide_summaries || [];
  if (slides.length > 0) {
    stops.push({ kind: "slides-overview", nodeId: "node-root", slides });
    slides.forEach(s => {
      const concept = s.topic_id ? topicById.get(s.topic_id) : undefined;
      const nodeId = concept ? `topic-${concept.id || ""}` : "node-root";
      stops.push({ kind: "slide-summary", nodeId, slideSummary: s, concept });
    });
  }

  return stops;
}

// Helper: extract slide number from a stop (badge "Slide N")
function getStopSlide(stop: TourStop): number | null {
  if (stop.kind === "topic-intro") return stop.concept.page_ref || stop.concept.source_slides?.[0] || null;
  if (stop.kind === "subsection") return stop.subsection.source_slides?.[0] || stop.concept.page_ref || null;
  if (stop.kind === "verses") {
    const v = stop.verses[0];
    if (typeof v !== "string" && v?.source_slide) return v.source_slide;
    return stop.concept.page_ref || null;
  }
  if (stop.kind === "quote") return stop.quote.source_slide || stop.concept.page_ref || null;
  if (stop.kind === "slide-summary") return stop.slideSummary.slide;
  return null;
}

function PresentationCanvas({ analysis, onExit }: PresentationModeProps) {
  const { nodes: initN, edges: initE } = useMemo(() => buildPresentationGraph(analysis), [analysis]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initN);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initE);
  const { setCenter, fitView } = useReactFlow();

  const tour = useMemo(() => buildTour(analysis), [analysis]);
  const [stopIdx, setStopIdx] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const autoPlayRef = useRef<number | null>(null);

  const current = tour[stopIdx];

  // Camera focus
  const focusNode = useCallback((stop: TourStop, instant = false) => {
    const node = initN.find(n => n.id === stop.nodeId);
    if (!node) return;
    const sizeMap: Record<string, { w: number; h: number }> = {
      root: { w: 300, h: 90 },
      topicCard: { w: 280, h: 110 },
      highlightCard: { w: 220, h: 70 },
      verseCard: { w: 160, h: 40 },
    };
    const s = sizeMap[node.type || "topicCard"];
    const cx = node.position.x + s.w / 2;
    const cy = node.position.y + s.h / 2;
    const zoom =
      stop.kind === "root" ? 0.85 :
      stop.kind === "slides-overview" ? 0.75 :
      stop.kind === "topic-intro" ? 1.05 :
      1.25;
    setCenter(cx, cy, { zoom, duration: instant ? 0 : 800 });

    setNodes(ns => ns.map(n => ({
      ...n,
      data: { ...n.data, selected: n.id === stop.nodeId },
      style: {
        ...n.style,
        opacity: n.id === stop.nodeId ? 1 : 0.32,
        transition: "opacity 0.5s ease",
      },
    })));
    setEdges(es => es.map(e => ({
      ...e,
      style: {
        ...e.style,
        opacity: (e.source === stop.nodeId || e.target === stop.nodeId) ? 1 : 0.18,
        transition: "opacity 0.5s ease",
      },
    })));
  }, [initN, setCenter, setNodes, setEdges]);

  useEffect(() => {
    const t = setTimeout(() => {
      fitView({ padding: 0.3, duration: 500 });
      setTimeout(() => focusNode(tour[0], false), 600);
    }, 100);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { focusNode(current); }, [stopIdx, current, focusNode]);

  const goNext = useCallback(() => setStopIdx(i => Math.min(tour.length - 1, i + 1)), [tour.length]);
  const goPrev = useCallback(() => setStopIdx(i => Math.max(0, i - 1)), []);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    const idx = tour.findIndex(s => s.nodeId === node.id);
    if (idx >= 0) { setAutoPlay(false); setStopIdx(idx); }
  }, [tour]);

  // Auto-play
  useEffect(() => {
    if (!autoPlay) {
      if (autoPlayRef.current) { window.clearTimeout(autoPlayRef.current); autoPlayRef.current = null; }
      return;
    }
    const dwell =
      current.kind === "topic-intro" ? 4500 :
      current.kind === "subsection" ? 5500 :
      current.kind === "verses" ? 4000 :
      current.kind === "quote" ? 4500 :
      current.kind === "slides-overview" ? 6000 :
      current.kind === "slide-summary" ? 3000 :
      3500;
    autoPlayRef.current = window.setTimeout(() => {
      if (stopIdx < tour.length - 1) goNext();
      else setAutoPlay(false);
    }, dwell);
    return () => { if (autoPlayRef.current) window.clearTimeout(autoPlayRef.current); };
  }, [autoPlay, stopIdx, current, goNext, tour.length]);

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit();
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); goNext(); }
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "p" || e.key === "P") setAutoPlay(p => !p);
      if (e.key === "f" || e.key === "F") fitView({ padding: 0.3, duration: 600 });
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, onExit, fitView]);

  // Fullscreen
  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
    return () => { document.exitFullscreen?.().catch(() => {}); };
  }, []);

  // Touch swipe
  const touchRef = useRef({ startX: 0 });
  const onTouchStart = (e: React.TouchEvent) => { touchRef.current.startX = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchRef.current.startX;
    if (Math.abs(dx) > 60) { dx < 0 ? goNext() : goPrev(); }
  };

  // Slide badge (top of caption)
  const slideNum = getStopSlide(current);
  const SlideBadge = slideNum ? (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
      style={{ background: "rgba(196,164,106,0.08)", border: "1px solid rgba(196,164,106,0.18)" }}>
      <span className="text-[9px] font-sans tracking-[2px] uppercase" style={{ color: "#8a7d6a" }}>Slide</span>
      <span className="text-[11px] font-sans font-semibold" style={{ color: "#c4a46a" }}>{slideNum}</span>
    </div>
  ) : null;

  // ---------- Captions per stop kind ----------
  const renderCaption = () => {
    if (current.kind === "root") {
      return (
        <div className="text-center">
          <p className="text-[10px] font-sans tracking-[3px] uppercase mb-2" style={{ color: "#8a7d6a" }}>Tema central</p>
          <h1 className="font-display font-bold mb-2" style={{ color: "#ede4d3", fontSize: "clamp(22px, 3vw, 36px)", lineHeight: 1.2 }}>
            {analysis.main_theme || analysis.hierarchy?.root?.label}
          </h1>
          {analysis.summary && (
            <p className="font-body italic max-w-[720px] mx-auto" style={{ color: "#c4b89e", fontSize: "clamp(13px, 1.4vw, 16px)" }}>
              {analysis.summary}
            </p>
          )}
        </div>
      );
    }

    if (current.kind === "topic-intro") {
      const c = current.concept;
      const note = c.expanded_note;
      const catColor = getCategoryColor(c.category);
      return (
        <div className="max-w-[860px] mx-auto">
          <div className="flex items-center gap-2 justify-center mb-3">
            <span className="text-[9px] font-sans font-bold tracking-[2px] uppercase" style={{ color: catColor }}>
              {getCategoryName(c.category)}
            </span>
            {SlideBadge}
          </div>
          <h2 className="font-display font-bold text-center mb-3" style={{ color: "#ede4d3", fontSize: "clamp(22px, 2.8vw, 32px)", lineHeight: 1.2 }}>
            {c.title}
          </h2>
          {note?.core_idea && (
            <p className="font-body italic text-center" style={{ color: "#d4b87a", fontSize: "clamp(14px, 1.5vw, 18px)", lineHeight: 1.5 }}>
              "{note.core_idea}"
            </p>
          )}
          {note?.impact_phrase && (
            <p className="text-center mt-3 pt-3 font-body italic" style={{ color: "#c4b89e", fontSize: "clamp(12px, 1.2vw, 14px)", borderTop: "1px solid rgba(196,164,106,0.1)" }}>
              {note.impact_phrase}
            </p>
          )}
        </div>
      );
    }

    if (current.kind === "subsection") {
      const c = current.concept;
      const sub = current.subsection;
      const catColor = getCategoryColor(c.category);
      return (
        <div className="max-w-[920px] mx-auto">
          <div className="flex items-center gap-2 justify-center mb-2">
            <span className="text-[9px] font-sans font-bold tracking-[2px] uppercase" style={{ color: catColor }}>
              {c.title}
            </span>
            {SlideBadge}
          </div>
          <h3 className="font-display font-semibold text-center mb-3" style={{ color: "#ede4d3", fontSize: "clamp(17px, 2vw, 24px)", lineHeight: 1.2 }}>
            {sub.subtitle}
          </h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 max-w-[860px] mx-auto">
            {sub.points.map((p, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: catColor }} />
                <span className="font-body" style={{ color: "#d4cab2", fontSize: "clamp(12px, 1.25vw, 15px)", lineHeight: 1.55 }}>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    if (current.kind === "verses") {
      const c = current.concept;
      return (
        <div className="max-w-[820px] mx-auto">
          <div className="flex items-center gap-2 justify-center mb-3">
            <span className="text-[9px] font-sans font-bold tracking-[2px] uppercase" style={{ color: "#7ba3c9" }}>
              Versículos · {c.title}
            </span>
            {SlideBadge}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-[760px] mx-auto">
            {current.verses.map((v, i) => {
              const ref = verseRefString(v);
              const ctx = typeof v === "string" ? "" : (v.context || "");
              const slide = typeof v === "string" ? null : v.source_slide;
              return (
                <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg"
                  style={{ background: "rgba(123,163,201,0.05)", border: "1px solid rgba(123,163,201,0.15)" }}>
                  <BookOpen size={14} className="mt-0.5 shrink-0" style={{ color: "#7ba3c9" }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-display font-semibold" style={{ color: "#7ba3c9", fontSize: "clamp(13px, 1.3vw, 15px)" }}>{ref}</span>
                      {slide && (
                        <span className="text-[9px] font-sans tracking-[1px] uppercase" style={{ color: "#5c5347" }}>Sl. {slide}</span>
                      )}
                    </div>
                    {ctx && (
                      <p className="font-body italic mt-1" style={{ color: "#a39882", fontSize: "clamp(11px, 1.05vw, 12px)", lineHeight: 1.4 }}>{ctx}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (current.kind === "quote") {
      const c = current.concept;
      const q = current.quote;
      return (
        <div className="text-center max-w-[720px] mx-auto">
          <div className="flex items-center gap-2 justify-center mb-3">
            <QuoteIcon size={12} style={{ color: "#c4a46a" }} />
            <span className="text-[9px] font-sans tracking-[2px] uppercase" style={{ color: "#8a7d6a" }}>Citação · {c.title}</span>
            {SlideBadge}
          </div>
          <p className="font-body italic" style={{ color: "#ede4d3", fontSize: "clamp(16px, 1.9vw, 22px)", lineHeight: 1.5 }}>
            "{q.text}"
          </p>
          <p className="font-sans mt-3" style={{ color: "#c4a46a", fontSize: "clamp(11px, 1.1vw, 13px)" }}>
            — {q.author}
          </p>
        </div>
      );
    }

    if (current.kind === "slides-overview") {
      const slides = current.slides;
      return (
        <div className="max-w-[1100px] mx-auto">
          <div className="flex items-center gap-2 justify-center mb-3">
            <span className="text-[9px] font-sans font-bold tracking-[2px] uppercase" style={{ color: "#c4a46a" }}>
              Todos os slides do PDF
            </span>
            <span className="text-[10px] font-sans" style={{ color: "#5c5347" }}>· {slides.length} slides</span>
          </div>
          <p className="text-center font-body italic mb-4" style={{ color: "#a39882", fontSize: "clamp(11px, 1.1vw, 13px)" }}>
            Clique em qualquer slide para abri-lo. A apresentação continua slide por slide.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-[28vh] overflow-y-auto pr-1">
            {slides.map((s) => {
              const cat = s.category;
              const color = cat ? getCategoryColor(cat) : "#8a7d6a";
              const idx = tour.findIndex(t => t.kind === "slide-summary" && (t as any).slideSummary?.slide === s.slide);
              return (
                <button
                  key={s.slide}
                  onClick={() => { if (idx >= 0) { setAutoPlay(false); setStopIdx(idx); } }}
                  className="text-left rounded-lg p-2 transition-all hover:scale-[1.02] active:scale-95"
                  style={{
                    background: "rgba(196,164,106,0.04)",
                    border: `1px solid ${color}33`,
                  }}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[9px] font-sans font-bold" style={{ color }}>{s.slide}</span>
                    {s.title && (
                      <span className="text-[9px] font-sans truncate" style={{ color: "#a39882" }}>{s.title}</span>
                    )}
                  </div>
                  <p className="text-[10px] font-body line-clamp-2" style={{ color: "#d4cab2", lineHeight: 1.35 }}>
                    {s.summary}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (current.kind === "slide-summary") {
      const s = current.slideSummary;
      const cat = s.category;
      const color = cat ? getCategoryColor(cat) : "#c4a46a";
      const c = current.concept;
      return (
        <div className="text-center max-w-[820px] mx-auto">
          <div className="flex items-center gap-2 justify-center mb-3">
            <span className="text-[9px] font-sans font-bold tracking-[2px] uppercase" style={{ color }}>
              {c ? c.title : "Slide do PDF"}
            </span>
            {SlideBadge}
          </div>
          {s.title && (
            <h3 className="font-display font-semibold mb-3" style={{ color: "#ede4d3", fontSize: "clamp(18px, 2.2vw, 26px)", lineHeight: 1.2 }}>
              {s.title}
            </h3>
          )}
          <p className="font-body" style={{ color: "#d4cab2", fontSize: "clamp(13px, 1.4vw, 17px)", lineHeight: 1.55 }}>
            {s.summary}
          </p>
          {!c && (
            <p className="text-[10px] mt-4 font-sans italic" style={{ color: "#5c5347" }}>
              Slide secundário · sem tópico principal vinculado
            </p>
          )}
        </div>
      );
    }

    return null;
  };

  // Stop kind label for control bar
  const stopKindLabel =
    current.kind === "root" ? "Tema" :
    current.kind === "topic-intro" ? "Tópico" :
    current.kind === "subsection" ? "Conteúdo" :
    current.kind === "verses" ? "Versículos" :
    current.kind === "quote" ? "Citação" :
    current.kind === "slides-overview" ? "Visão geral" :
    current.kind === "slide-summary" ? `Slide ${current.slideSummary.slide}` : "";

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col select-none"
      style={{ background: "#0f0d0a" }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Progress bar */}
      <div className="h-1 w-full shrink-0" style={{ background: "rgba(196,164,106,0.06)" }}>
        <div className="h-full transition-all duration-700"
          style={{ width: `${((stopIdx + 1) / tour.length) * 100}%`, background: "linear-gradient(90deg, #c4a46a, #d4b87a)" }} />
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodesFocusable
          nodeTypes={nodeTypes}
          minZoom={0.1}
          maxZoom={2.5}
          panOnDrag={false}
          nodesDraggable={false}
          nodesConnectable={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          panOnScroll={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="rgba(196,164,106,0.05)" style={{ background: "#0f0d0a" }} />
        </ReactFlow>

        <button
          onClick={goPrev}
          aria-label="Anterior"
          className="absolute top-0 left-0 h-full w-[10%] z-10 flex items-center justify-start pl-4 group"
          style={{ background: "transparent", cursor: "w-resize" }}
        >
          <ChevronLeft size={32} style={{ color: "rgba(196,164,106,0.0)" }} className="group-hover:!text-[rgba(196,164,106,0.6)] transition-colors" />
        </button>
        <button
          onClick={goNext}
          aria-label="Próximo"
          className="absolute top-0 right-0 h-full w-[10%] z-10 flex items-center justify-end pr-4 group"
          style={{ background: "transparent", cursor: "e-resize" }}
        >
          <ChevronRight size={32} style={{ color: "rgba(196,164,106,0.0)" }} className="group-hover:!text-[rgba(196,164,106,0.6)] transition-colors" />
        </button>
      </div>

      {/* Caption */}
      <div
        key={stopIdx}
        className="shrink-0 px-6 py-5 animate-fade-in"
        style={{
          background: "linear-gradient(to top, rgba(15,13,10,0.98), rgba(15,13,10,0.92) 70%, rgba(15,13,10,0))",
          backdropFilter: "blur(10px)",
          minHeight: 180,
          maxHeight: "44vh",
          overflowY: "auto",
        }}
      >
        {renderCaption()}
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between px-6 py-3 shrink-0"
        style={{ background: "rgba(15,13,10,0.95)", borderTop: "1px solid rgba(196,164,106,0.08)" }}>
        <button onClick={goPrev} disabled={stopIdx === 0}
          className="p-2 rounded-lg transition-opacity disabled:opacity-10" style={{ color: "#c4a46a" }}>
          <ChevronLeft size={22} />
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoPlay(p => !p)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-[11px] font-sans font-semibold"
            style={{
              background: autoPlay ? "rgba(196,164,106,0.15)" : "transparent",
              color: autoPlay ? "#c4a46a" : "#8a7d6a",
              border: `1px solid ${autoPlay ? "rgba(196,164,106,0.3)" : "rgba(196,164,106,0.1)"}`,
            }}
          >
            {autoPlay ? <Pause size={12} /> : <Play size={12} />}
            <span>{autoPlay ? "Pausar" : "Auto"}</span>
          </button>
          <span className="text-[12px] font-sans" style={{ color: "#5c5347" }}>
            {stopIdx + 1} / {tour.length}
          </span>
          <span className="text-[10px] font-sans uppercase tracking-[1.5px] hidden sm:inline" style={{ color: "#5c5347" }}>
            {stopKindLabel}
          </span>
          <button onClick={onExit} className="p-2 rounded-lg transition-colors hover:bg-white/5" style={{ color: "#8a7d6a" }}>
            <X size={16} />
          </button>
        </div>

        <button onClick={goNext} disabled={stopIdx === tour.length - 1}
          className="p-2 rounded-lg transition-opacity disabled:opacity-10" style={{ color: "#c4a46a" }}>
          <ChevronRight size={22} />
        </button>
      </div>
    </div>
  );
}

export default function PresentationMode(props: PresentationModeProps) {
  return (
    <ReactFlowProvider>
      <PresentationCanvas {...props} />
    </ReactFlowProvider>
  );
}
