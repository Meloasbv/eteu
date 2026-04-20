import { useCallback, useMemo, useEffect, useState, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  MarkerType,
  BackgroundVariant,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import {
  ArrowLeftRight, ArrowUpDown, X, Map, Layers, Eye,
  Loader2, Presentation, Share2, Maximize2, Minimize2,
} from "lucide-react";
import type { AnalysisResult, KeyConcept } from "./types";
import { getCategoryColor } from "./types";
import RootNodeComp from "./nodes/RootNode";
import TopicCardComp from "./nodes/TopicCard";
import HighlightCardComp from "./nodes/HighlightCard";
import VerseCardComp from "./nodes/VerseCard";
import NotePanel from "./NotePanel";
import PresentationMode from "./PresentationMode";
import ShareDialog from "./ShareDialog";

const MindMapQuizView = lazy(() => import("./MindMapQuizView"));
const StudyRevealView = lazy(() => import("./StudyRevealView"));

const nodeTypes = {
  root: RootNodeComp,
  topicCard: TopicCardComp,
  highlightCard: HighlightCardComp,
  verseCard: VerseCardComp,
};

const defaultEdgeOptions = {
  type: "default" as const,
  animated: false,
  style: { stroke: "rgba(196,164,106,0.18)", strokeWidth: 1.5 },
  markerEnd: { type: MarkerType.ArrowClosed, color: "rgba(196,164,106,0.25)", width: 12, height: 12 },
};

// ── Layout ──

function getLayoutedElements(nodes: Node[], edges: Edge[], direction = "TB") {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 80, ranksep: 100, marginx: 60, marginy: 60 });

  const sizeMap: Record<string, { w: number; h: number }> = {
    root: { w: 300, h: 90 },
    topicCard: { w: 280, h: 130 },
    highlightCard: { w: 220, h: 70 },
    verseCard: { w: 160, h: 40 },
  };

  nodes.forEach(node => {
    const s = sizeMap[node.type || "topicCard"] || sizeMap.topicCard;
    g.setNode(node.id, { width: s.w, height: s.h });
  });
  edges.forEach(edge => g.setEdge(edge.source, edge.target));
  dagre.layout(g);

  return {
    nodes: nodes.map(node => {
      const pos = g.node(node.id);
      const s = sizeMap[node.type || "topicCard"] || sizeMap.topicCard;
      return { ...node, position: { x: pos.x - s.w / 2, y: pos.y - s.h / 2 } };
    }),
    edges,
  };
}

// ── Build graph from analysis ──

function buildFromAnalysis(
  analysis: AnalysisResult,
  selectedNodeId: string | null,
  images: Record<string, string> = {},
  loadingImages: Record<string, boolean> = {},
) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const rootId = `node-root`;
  nodes.push({
    id: rootId,
    type: "root",
    position: { x: 0, y: 0 },
    data: {
      label: analysis.main_theme || analysis.hierarchy.root.label,
      imageUrl: images["__root__"],
      imageLoading: loadingImages["__root__"],
    },
  });

  const topicConcepts = (analysis.key_concepts || []).filter(
    c => !c.type || c.type === "topic"
  );

  topicConcepts.forEach((concept, i) => {
    const id = `topic-${concept.id || i}`;
    const catColor = getCategoryColor(concept.category);
    // Limit highlights to 2 max per topic to keep map clean
    const childHighlights = (concept.child_highlights || []).slice(0, 2);
    const noteVerses = concept.expanded_note?.verses || [];
    const verseCount = noteVerses.length || (concept.bible_refs || []).length;
    const keyPointsCount = (concept.expanded_note?.key_points || concept.expanded_note?.affirmations || []).length;
    const slides = concept.source_slides || (concept.page_ref ? [concept.page_ref] : []);

    nodes.push({
      id,
      type: "topicCard",
      position: { x: 0, y: 0 },
      data: {
        label: concept.title,
        summary: concept.summary || concept.expanded_note?.core_idea || concept.coreIdea || concept.description?.substring(0, 80),
        category: concept.category,
        hasNote: true,
        childCount: keyPointsCount,
        verseCount,
        selected: selectedNodeId === id,
        nodeId: id,
        isKey: concept.is_key === true,
        pageRef: concept.page_ref,
        sourceSlides: slides,
        imageUrl: images[id],
        imageLoading: loadingImages[id],
      },
    });

    // Connect root → topic
    edges.push({
      id: `edge-root-${id}`,
      source: rootId,
      target: id,
      style: { stroke: `${catColor}66`, strokeWidth: 1.5 },
    });

    // HighlightCard children — only the most quotable (max 2)
    childHighlights.forEach((hl, j) => {
      const hlId = `hl-${i}-${j}`;
      nodes.push({
        id: hlId,
        type: "highlightCard",
        position: { x: 0, y: 0 },
        data: { label: hl, pageRef: concept.page_ref },
      });
      edges.push({
        id: `edge-${id}-${hlId}`,
        source: id,
        target: hlId,
        style: { stroke: "rgba(196,164,106,0.12)", strokeWidth: 1, strokeDasharray: "6 3" },
      });
    });

    // Verses are NEVER nodes — they live inside the note's expanded view as chips
  });

  // Standalone highlight concepts (rare, kept for legacy)
  const highlights = (analysis.key_concepts || []).filter(c => c.type === "highlight");
  highlights.slice(0, 4).forEach((hl, i) => {
    const hlId = `hl-standalone-${i}`;
    nodes.push({
      id: hlId,
      type: "highlightCard",
      position: { x: 0, y: 0 },
      data: { label: hl.title || hl.description },
    });
    edges.push({
      id: `edge-root-${hlId}`,
      source: rootId,
      target: hlId,
      style: { stroke: "rgba(196,164,106,0.12)", strokeWidth: 1 },
    });
  });

  // NOTE: type="verse" concepts are intentionally ignored — verses live in notes only.

  return getLayoutedElements(nodes, edges);
}

// ── Component ──

interface Props {
  analysis: AnalysisResult;
  mapId?: string | null;
  onEnsureSavedForShare?: () => Promise<string | null>;
  onClose: () => void;
}

export default function MindMapCanvas({ analysis, mapId, onEnsureSavedForShare, onClose }: Props) {
  const isMobile = useIsMobile();
  const [direction, setDirection] = useState<"TB" | "LR">("LR");
  const [studyMode, setStudyMode] = useState<"map" | "quiz" | "review">("map");
  const [quizConceptId, setQuizConceptId] = useState<string | null>(null);
  const [openNoteIndex, setOpenNoteIndex] = useState<number | null>(null);
  const [showPresentation, setShowPresentation] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareState, setShareState] = useState<{ isPublic: boolean; slug: string | null }>({ isPublic: false, slug: null });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (e) {
      console.warn("fullscreen toggle failed", e);
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);
  // Hydrate share state from saved map's study_notes
  useEffect(() => {
    if (!mapId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("mind_maps")
        .select("study_notes")
        .eq("id", mapId)
        .maybeSingle();
      if (cancelled || !data) return;
      const sn = (data.study_notes as Record<string, unknown> | null) ?? {};
      setShareState({
        isPublic: Boolean((sn as any).is_public),
        slug: ((sn as any).public_slug as string | null) ?? null,
      });
    })();
    return () => { cancelled = true; };
  }, [mapId]);
  const [focusBranch, setFocusBranch] = useState<string | null>(null);
  const [images, setImages] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>({});

  const topicConcepts = useMemo(
    () => (analysis.key_concepts || []).filter(c => !c.type || c.type === "topic"),
    [analysis]
  );

  const selectedNodeId = openNoteIndex !== null ? `topic-${topicConcepts[openNoteIndex]?.id || openNoteIndex}` : null;

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildFromAnalysis(analysis, selectedNodeId, images, loadingImages),
    [analysis, selectedNodeId, images, loadingImages]
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onLayout = useCallback((dir: "TB" | "LR") => {
    setDirection(dir);
    const { nodes: ln, edges: le } = getLayoutedElements(nodes, edges, dir);
    setNodes([...ln]);
    setEdges([...le]);
  }, [nodes, edges, setNodes, setEdges]);

  useEffect(() => {
    const { nodes: ln, edges: le } = buildFromAnalysis(analysis, selectedNodeId, images, loadingImages);
    setNodes(ln);
    setEdges(le);
  }, [analysis, selectedNodeId, images, loadingImages]);

  // Generate AI images for the root + key topics in the background (non-blocking)
  useEffect(() => {
    let cancelled = false;
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-card-image`;
    const headers = {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    };

    const targets: { key: string; body: Record<string, unknown> }[] = [
      { key: "__root__", body: { title: analysis.main_theme || "Tema", summary: analysis.summary, role: "root" } },
      ...topicConcepts
        .filter(c => c.is_key)
        .map((c, i) => ({
          key: `topic-${c.id || i}`,
          body: { title: c.title, summary: c.summary || c.expanded_note?.core_idea, category: c.category, role: "topic" },
        })),
    ];

    const todo = targets.filter(t => !images[t.key] && !loadingImages[t.key]);
    if (todo.length === 0) return;

    setLoadingImages(prev => {
      const next = { ...prev };
      todo.forEach(t => { next[t.key] = true; });
      return next;
    });

    todo.forEach(async (t) => {
      try {
        const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(t.body) });
        const data = await res.json();
        if (cancelled) return;
        if (data?.image) {
          setImages(prev => ({ ...prev, [t.key]: data.image }));
        }
      } catch (e) {
        console.warn("card image failed", t.key, e);
      } finally {
        if (!cancelled) {
          setLoadingImages(prev => { const n = { ...prev }; delete n[t.key]; return n; });
        }
      }
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis]);

  const onNodeClick = useCallback((_: any, node: Node) => {
    if (node.type === "topicCard") {
      const idx = topicConcepts.findIndex((c, i) => {
        const expectedId = `topic-${c.id || i}`;
        return expectedId === node.id;
      });
      if (idx >= 0) {
        setOpenNoteIndex(idx);
      }
    }
  }, [topicConcepts]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && openNoteIndex !== null) {
        setOpenNoteIndex(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [openNoteIndex]);

  const quizCount = topicConcepts.length * 3;

  const fallbackLoader = (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="animate-spin" size={24} style={{ color: "#c4a46a" }} />
    </div>
  );

  const StudyModeTabs = () => (
    <div className="flex gap-0.5 rounded-xl p-1"
      style={{ background: "rgba(15,13,10,0.9)", border: "1px solid rgba(196,164,106,0.1)", backdropFilter: "blur(12px)" }}>
      {[
        { key: "map" as const, icon: Map, label: "Mapa" },
        { key: "quiz" as const, icon: Layers, label: "Quiz", badge: quizCount },
        { key: "review" as const, icon: Eye, label: "Revisão" },
      ].map(tab => (
        <button
          key={tab.key}
          onClick={() => { setStudyMode(tab.key); if (tab.key === "quiz") setQuizConceptId(null); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-sans font-semibold transition-all whitespace-nowrap"
          style={{
            background: studyMode === tab.key ? "rgba(196,164,106,0.1)" : "transparent",
            color: studyMode === tab.key ? "#c4a46a" : "#8a7d6a",
            border: studyMode === tab.key ? "1px solid rgba(196,164,106,0.2)" : "1px solid transparent",
          }}
        >
          <tab.icon size={14} />
          <span className="hidden sm:inline">{tab.label}</span>
          {tab.badge && studyMode !== tab.key && (
            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold"
              style={{ background: "#d4854a", color: "white", minWidth: 16, textAlign: "center" }}>
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );

  if (studyMode !== "map") {
    return (
      <div className="flex flex-col h-full w-full">
        <div className="flex items-center justify-between px-4 py-2 shrink-0"
          style={{ borderBottom: "1px solid rgba(196,164,106,0.1)" }}>
          <StudyModeTabs />
          <button onClick={onClose} className="p-2 rounded-lg transition-colors" style={{ color: "#8a7d6a" }}>
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <Suspense fallback={fallbackLoader}>
            {studyMode === "quiz" ? (
              <MindMapQuizView analysis={analysis} onBack={() => setStudyMode("map")} filterConceptId={quizConceptId} />
            ) : (
              <StudyRevealView analysis={analysis} onBack={() => setStudyMode("map")} />
            )}
          </Suspense>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex items-center justify-between px-4 py-2 shrink-0"
        style={{ borderBottom: "1px solid rgba(196,164,106,0.1)" }}>
        <StudyModeTabs />
        <button onClick={onClose} className="p-2 rounded-lg transition-colors" style={{ color: "#8a7d6a" }}>
          <X size={16} />
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 h-full relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.15}
            maxZoom={2.5}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={24}
              size={1}
              color="rgba(196,164,106,0.04)"
              style={{ background: "#16130f" }}
            />
            <MiniMap
              nodeColor={(n) => {
                if (n.type === "root") return "#c4a46a";
                if (n.type === "topicCard") {
                  return getCategoryColor((n.data as any)?.category);
                }
                if (n.type === "highlightCard") return "rgba(196,164,106,0.4)";
                if (n.type === "verseCard") return "rgba(123,163,201,0.5)";
                return "rgba(138,125,106,0.2)";
              }}
              style={{
                background: "rgba(30,26,20,0.9)",
                border: "1px solid rgba(196,164,106,0.15)",
                borderRadius: 12,
              }}
              pannable
              zoomable
            />
            <Controls
              style={{
                background: "rgba(30,26,20,0.95)",
                border: "1px solid rgba(196,164,106,0.15)",
                borderRadius: 12,
              }}
            />

            <Panel position="top-center">
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl shadow-lg"
                style={{
                  background: "rgba(30,26,20,0.95)",
                  border: "1px solid rgba(196,164,106,0.15)",
                  backdropFilter: "blur(12px)",
                }}>
                <ToolbarBtn icon={ArrowUpDown} label="Vertical" active={direction === "TB"} onClick={() => onLayout("TB")} />
                <ToolbarBtn icon={ArrowLeftRight} label="Horizontal" active={direction === "LR"} onClick={() => onLayout("LR")} />
                <div className="w-px h-4 mx-1" style={{ background: "rgba(196,164,106,0.15)" }} />
                <ToolbarBtn icon={Presentation} label="Apresentar" onClick={() => setShowPresentation(true)} />
                <ToolbarBtn icon={Share2} label="Compartilhar" onClick={() => setShowShareDialog(true)} />
              </div>
            </Panel>
          </ReactFlow>
        </div>

        {openNoteIndex !== null && (
          <NotePanel
            concept={topicConcepts[openNoteIndex] || null}
            concepts={topicConcepts}
            currentIndex={openNoteIndex}
            onNavigate={(idx) => setOpenNoteIndex(idx)}
            onClose={() => setOpenNoteIndex(null)}
            onQuiz={(conceptId) => {
              setQuizConceptId(conceptId);
              setOpenNoteIndex(null);
              setStudyMode("quiz");
            }}
          />
        )}
      </div>

      {isMobile && studyMode === "map" && openNoteIndex === null && (
        <div
          className="flex items-center justify-around px-2 py-2 shrink-0"
          style={{
            background: "rgba(15,13,10,0.95)",
            backdropFilter: "blur(12px)",
            borderTop: "1px solid rgba(196,164,106,0.08)",
            height: 56,
          }}
        >
          <MobileBarBtn icon={Presentation} label="Apresentar" onClick={() => setShowPresentation(true)} />
          <MobileBarBtn icon={Share2} label="Compartilhar" onClick={() => setShowShareDialog(true)} />
          <MobileBarBtn icon={X} label="Fechar" onClick={onClose} />
        </div>
      )}

      {showPresentation && (
        <PresentationMode analysis={analysis} onExit={() => setShowPresentation(false)} />
      )}

      {showShareDialog && (
        <ShareDialog
          mapId={mapId ?? null}
          title={analysis.main_theme || "Mapa Mental"}
          isPublic={shareState.isPublic}
          publicSlug={shareState.slug}
          onClose={() => setShowShareDialog(false)}
          onUpdate={(isPublic, slug) => setShareState({ isPublic, slug })}
          onEnsureSaved={onEnsureSavedForShare}
        />
      )}
    </div>
  );
}

function ToolbarBtn({ icon: Icon, label, active, onClick }: { icon: React.ElementType; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-sans font-medium transition-all active:scale-95"
      style={{
        background: active ? "rgba(196,164,106,0.12)" : "transparent",
        color: active ? "#c4a46a" : "#8a7d6a",
      }}
    >
      <Icon size={14} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function MobileBarBtn({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-all active:scale-95"
      style={{ color: "#8a7d6a", minWidth: 48, minHeight: 44 }}
    >
      <Icon size={20} />
      <span className="text-[9px] font-sans">{label}</span>
    </button>
  );
}
