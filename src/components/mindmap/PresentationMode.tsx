import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { X, ChevronLeft, ChevronRight, Play, Pause, BookOpen } from "lucide-react";
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
import type { AnalysisResult, KeyConcept } from "./types";
import { getCategoryColor, getCategoryName } from "./types";
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

// Build the same graph used in MindMapCanvas (simplified, reuses layout)
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
        summary: concept.summary || concept.expanded_note?.core_idea || concept.description?.substring(0, 80),
        category: concept.category,
        hasNote: true,
        childCount: (concept.child_highlights || []).length,
        verseCount: (concept.child_verses || []).length,
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

    (concept.child_highlights || []).forEach((hl, j) => {
      const hlId = `hl-${i}-${j}`;
      nodes.push({ id: hlId, type: "highlightCard", position: { x: 0, y: 0 }, data: { label: hl, pageRef: concept.page_ref } });
      edges.push({
        id: `e-${id}-${hlId}`, source: id, target: hlId,
        style: { stroke: "rgba(196,164,106,0.18)", strokeWidth: 1, strokeDasharray: "6 3" },
      });
    });

    const childVerses = concept.child_verses || concept.expanded_note?.verses || concept.bible_refs || [];
    childVerses.forEach((v, j) => {
      const vId = `verse-${i}-${j}`;
      nodes.push({ id: vId, type: "verseCard", position: { x: 0, y: 0 }, data: { label: v, pageRef: concept.page_ref } });
      edges.push({
        id: `e-${id}-${vId}`, source: id, target: vId,
        style: { stroke: "rgba(123,163,201,0.2)", strokeWidth: 1 },
      });
    });
  });

  // Layout
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 60, ranksep: 100, marginx: 60, marginy: 60 });
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

// Build sequential tour: root → for each topic [topic, highlights..., verses...]
type TourStop = {
  nodeId: string;
  kind: "root" | "topic" | "highlight" | "verse";
  topicIndex?: number;
  childIndex?: number;
  concept?: KeyConcept;
  text?: string;
};

function buildTour(analysis: AnalysisResult): TourStop[] {
  const stops: TourStop[] = [{ nodeId: "node-root", kind: "root" }];
  const topics = (analysis.key_concepts || []).filter(c => !c.type || c.type === "topic");

  topics.forEach((concept, i) => {
    const id = `topic-${concept.id || i}`;
    stops.push({ nodeId: id, kind: "topic", topicIndex: i, concept });

    (concept.child_highlights || []).forEach((hl, j) => {
      stops.push({ nodeId: `hl-${i}-${j}`, kind: "highlight", topicIndex: i, childIndex: j, concept, text: hl });
    });

    const childVerses = concept.child_verses || concept.expanded_note?.verses || concept.bible_refs || [];
    childVerses.forEach((v, j) => {
      stops.push({ nodeId: `verse-${i}-${j}`, kind: "verse", topicIndex: i, childIndex: j, concept, text: v });
    });
  });

  return stops;
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

  // Camera animation: pan + zoom to current node
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
    const zoom = stop.kind === "root" ? 0.85 : stop.kind === "topic" ? 1.1 : 1.4;
    setCenter(cx, cy, { zoom, duration: instant ? 0 : 900 });

    // Highlight current node visually
    setNodes(ns => ns.map(n => ({
      ...n,
      data: { ...n.data, selected: n.id === stop.nodeId },
      style: {
        ...n.style,
        opacity: n.id === stop.nodeId ? 1 : 0.35,
        transition: "opacity 0.6s ease",
      },
    })));
    setEdges(es => es.map(e => ({
      ...e,
      style: {
        ...e.style,
        opacity: (e.source === stop.nodeId || e.target === stop.nodeId) ? 1 : 0.2,
        transition: "opacity 0.6s ease",
      },
    })));
  }, [initN, setCenter, setNodes, setEdges]);

  // Initial fit
  useEffect(() => {
    const t = setTimeout(() => {
      fitView({ padding: 0.3, duration: 500 });
      setTimeout(() => focusNode(tour[0], false), 600);
    }, 100);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Focus on stop change
  useEffect(() => {
    focusNode(current);
  }, [stopIdx, current, focusNode]);

  const goNext = useCallback(() => {
    setStopIdx(i => Math.min(tour.length - 1, i + 1));
  }, [tour.length]);

  const goPrev = useCallback(() => {
    setStopIdx(i => Math.max(0, i - 1));
  }, []);

  // Auto-play (video mode)
  useEffect(() => {
    if (!autoPlay) {
      if (autoPlayRef.current) { window.clearTimeout(autoPlayRef.current); autoPlayRef.current = null; }
      return;
    }
    const dwell = current.kind === "topic" ? 4500 : current.kind === "root" ? 3500 : 2800;
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

  // Bottom caption content based on stop kind
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

    if (current.kind === "topic" && current.concept) {
      const c = current.concept;
      const note = c.expanded_note;
      const catColor = getCategoryColor(c.category);
      const coreIdea = note?.core_idea || c.coreIdea || "";
      const affirmations = note?.affirmations || c.keyPoints || [];
      const impact = note?.impact_phrase || c.impactPhrase;
      return (
        <div className="max-w-[860px] mx-auto">
          <div className="flex items-center gap-2 justify-center mb-2">
            <span className="text-[9px] font-sans font-bold tracking-[2px] uppercase" style={{ color: catColor }}>
              {getCategoryName(c.category)}
            </span>
            {c.page_ref && (
              <span className="text-[9px] font-sans tracking-[1.5px] uppercase px-2 py-0.5 rounded"
                style={{ color: "#8a7d6a", background: "rgba(196,164,106,0.06)" }}>
                p. {c.page_ref}
              </span>
            )}
          </div>
          <h2 className="font-display font-bold text-center mb-3" style={{ color: "#ede4d3", fontSize: "clamp(20px, 2.6vw, 30px)", lineHeight: 1.2 }}>
            {c.title}
          </h2>
          {coreIdea && (
            <p className="font-body italic text-center mb-3" style={{ color: "#d4b87a", fontSize: "clamp(13px, 1.4vw, 17px)", lineHeight: 1.5 }}>
              "{coreIdea}"
            </p>
          )}
          {affirmations.length > 0 && (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 max-w-[800px] mx-auto">
              {affirmations.slice(0, 4).map((a, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ background: catColor }} />
                  <span className="font-body" style={{ color: "#c4b89e", fontSize: "clamp(11px, 1.1vw, 13px)", lineHeight: 1.5 }}>{a}</span>
                </li>
              ))}
            </ul>
          )}
          {impact && (
            <p className="text-center mt-3 pt-2 font-body italic" style={{ color: "#d4b87a", fontSize: "clamp(11px, 1.2vw, 14px)", borderTop: "1px solid rgba(196,164,106,0.1)" }}>
              "{impact}"
            </p>
          )}
        </div>
      );
    }

    if (current.kind === "highlight") {
      return (
        <div className="text-center max-w-[640px] mx-auto">
          <p className="text-[9px] font-sans tracking-[2px] uppercase mb-2" style={{ color: "#8a7d6a" }}>
            Destaque · {current.concept?.title}
          </p>
          <p className="font-body italic" style={{ color: "#ede4d3", fontSize: "clamp(15px, 1.8vw, 22px)", lineHeight: 1.5 }}>
            "{current.text}"
          </p>
        </div>
      );
    }

    if (current.kind === "verse") {
      return (
        <div className="text-center max-w-[640px] mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-2"
            style={{ background: "rgba(123,163,201,0.08)", border: "1px solid rgba(123,163,201,0.25)" }}>
            <BookOpen size={12} style={{ color: "#7ba3c9" }} />
            <span className="font-body italic text-[12px]" style={{ color: "#7ba3c9" }}>Referência bíblica</span>
          </div>
          <p className="font-display font-bold" style={{ color: "#7ba3c9", fontSize: "clamp(20px, 2.4vw, 28px)" }}>
            {current.text}
          </p>
          <p className="text-[11px] font-sans mt-2" style={{ color: "#8a7d6a" }}>
            de "{current.concept?.title}"
          </p>
        </div>
      );
    }

    return null;
  };

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

      {/* Canvas — top portion */}
      <div className="flex-1 relative overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
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

        {/* Left/Right click zones for navigation (transparent) */}
        <button
          onClick={goPrev}
          aria-label="Anterior"
          className="absolute top-0 left-0 h-full w-[15%] z-10 flex items-center justify-start pl-4 group"
          style={{ background: "transparent", cursor: "w-resize" }}
        >
          <ChevronLeft size={32} style={{ color: "rgba(196,164,106,0.0)" }} className="group-hover:!text-[rgba(196,164,106,0.6)] transition-colors" />
        </button>
        <button
          onClick={goNext}
          aria-label="Próximo"
          className="absolute top-0 right-0 h-full w-[15%] z-10 flex items-center justify-end pr-4 group"
          style={{ background: "transparent", cursor: "e-resize" }}
        >
          <ChevronRight size={32} style={{ color: "rgba(196,164,106,0.0)" }} className="group-hover:!text-[rgba(196,164,106,0.6)] transition-colors" />
        </button>
      </div>

      {/* Caption overlay — bottom portion */}
      <div
        key={stopIdx}
        className="shrink-0 px-6 py-5 animate-fade-in"
        style={{
          background: "linear-gradient(to top, rgba(15,13,10,0.98), rgba(15,13,10,0.92) 70%, rgba(15,13,10,0))",
          backdropFilter: "blur(10px)",
          minHeight: 160,
          maxHeight: "38vh",
          overflowY: "auto",
        }}
      >
        {renderCaption()}
      </div>

      {/* Bottom control bar */}
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
            {current.kind === "root" ? "Tema" : current.kind === "topic" ? "Tópico" : current.kind === "highlight" ? "Destaque" : "Versículo"}
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
