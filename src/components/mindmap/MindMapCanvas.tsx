import { useCallback, useMemo, useEffect, useState, lazy, Suspense } from "react";
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
  ArrowLeftRight, ArrowUpDown, X, Map, ClipboardList, Layers, Eye,
  Loader2, Presentation, Share2, Focus, MoreHorizontal,
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

const StudyFlashcardView = lazy(() => import("./StudyFlashcardView"));
const StudyNotesListView = lazy(() => import("./StudyNotesListView"));
const StudyRevealView = lazy(() => import("./StudyRevealView"));

const nodeTypes = {
  root: RootNodeComp,
  topicCard: TopicCardComp,
  highlightCard: HighlightCardComp,
  verseCard: VerseCardComp,
};

const defaultEdgeOptions = {
  type: "smoothstep" as const,
  animated: false,
  style: { stroke: "rgba(196,164,106,0.15)", strokeWidth: 1.5 },
  markerEnd: { type: MarkerType.ArrowClosed, color: "rgba(196,164,106,0.25)", width: 12, height: 12 },
};

// ── Layout ──

function getLayoutedElements(nodes: Node[], edges: Edge[], direction = "TB") {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 60, ranksep: 80, marginx: 40, marginy: 40 });

  const sizeMap: Record<string, { w: number; h: number }> = {
    root: { w: 300, h: 90 },
    topicCard: { w: 280, h: 110 },
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

function buildFromAnalysis(analysis: AnalysisResult, selectedNodeId: string | null) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let nodeId = 0;

  // Root
  const rootId = `node-root`;
  nodes.push({
    id: rootId,
    type: "root",
    position: { x: 0, y: 0 },
    data: { label: analysis.main_theme || analysis.hierarchy.root.label },
  });

  // Create TopicCards from key_concepts
  const topicConcepts = (analysis.key_concepts || []).filter(
    c => !c.type || c.type === "topic"
  );

  topicConcepts.forEach((concept, i) => {
    const id = `topic-${concept.id || i}`;
    const catColor = getCategoryColor(concept.category);

    const childHighlights = concept.child_highlights || [];
    const childVerses = concept.child_verses || concept.expanded_note?.verses || concept.bible_refs || [];

    nodes.push({
      id,
      type: "topicCard",
      position: { x: 0, y: 0 },
      data: {
        label: concept.title,
        summary: concept.summary || concept.expanded_note?.core_idea || concept.coreIdea || concept.description?.substring(0, 80),
        category: concept.category,
        hasNote: true,
        childCount: childHighlights.length,
        verseCount: childVerses.length,
        selected: selectedNodeId === id,
        nodeId: id,
      },
    });

    // Connect root → topic
    edges.push({
      id: `edge-root-${id}`,
      source: rootId,
      target: id,
      style: { stroke: `${catColor}66`, strokeWidth: 1.5 },
    });

    // HighlightCard children
    childHighlights.forEach((hl, j) => {
      const hlId = `hl-${i}-${j}`;
      nodes.push({
        id: hlId,
        type: "highlightCard",
        position: { x: 0, y: 0 },
        data: { label: hl },
      });
      edges.push({
        id: `edge-${id}-${hlId}`,
        source: id,
        target: hlId,
        style: { stroke: "rgba(196,164,106,0.12)", strokeWidth: 1, strokeDasharray: "6 3" },
      });
    });

    // VerseCard children
    childVerses.forEach((v, j) => {
      const vId = `verse-${i}-${j}`;
      nodes.push({
        id: vId,
        type: "verseCard",
        position: { x: 0, y: 0 },
        data: { label: v },
      });
      edges.push({
        id: `edge-${id}-${vId}`,
        source: id,
        target: vId,
        style: { stroke: "rgba(123,163,201,0.15)", strokeWidth: 1 },
      });
    });
  });

  // Also process explicit highlight/verse concepts
  const highlights = (analysis.key_concepts || []).filter(c => c.type === "highlight");
  highlights.forEach((hl, i) => {
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

  const verseNodes = (analysis.key_concepts || []).filter(c => c.type === "verse");
  verseNodes.forEach((v, i) => {
    const vId = `verse-standalone-${i}`;
    nodes.push({
      id: vId,
      type: "verseCard",
      position: { x: 0, y: 0 },
      data: { label: v.title || v.description },
    });
    edges.push({
      id: `edge-root-${vId}`,
      source: rootId,
      target: vId,
      style: { stroke: "rgba(123,163,201,0.15)", strokeWidth: 1 },
    });
  });

  return getLayoutedElements(nodes, edges);
}

// ── Component ──

interface Props {
  analysis: AnalysisResult;
  onClose: () => void;
}

export default function MindMapCanvas({ analysis, onClose }: Props) {
  const isMobile = useIsMobile();
  const [direction, setDirection] = useState<"TB" | "LR">("LR");
  const [studyMode, setStudyMode] = useState<"map" | "notes" | "flashcards" | "review">("map");
  const [openNoteIndex, setOpenNoteIndex] = useState<number | null>(null);
  const [showPresentation, setShowPresentation] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareState, setShareState] = useState<{ isPublic: boolean; slug: string | null }>({ isPublic: false, slug: null });
  const [focusBranch, setFocusBranch] = useState<string | null>(null);

  const topicConcepts = useMemo(
    () => (analysis.key_concepts || []).filter(c => !c.type || c.type === "topic"),
    [analysis]
  );

  const selectedNodeId = openNoteIndex !== null ? `topic-${topicConcepts[openNoteIndex]?.id || openNoteIndex}` : null;

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildFromAnalysis(analysis, selectedNodeId),
    [analysis, selectedNodeId]
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
    const { nodes: ln, edges: le } = buildFromAnalysis(analysis, selectedNodeId);
    setNodes(ln);
    setEdges(le);
  }, [analysis, selectedNodeId]);

  // Handle node click → open NotePanel for TopicCards
  const onNodeClick = useCallback((_: any, node: Node) => {
    if (node.type === "topicCard") {
      // Find index in topicConcepts
      const idx = topicConcepts.findIndex((c, i) => {
        const expectedId = `topic-${c.id || i}`;
        return expectedId === node.id;
      });
      if (idx >= 0) {
        setOpenNoteIndex(idx);
      }
    }
  }, [topicConcepts]);

  // Close with Esc
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && openNoteIndex !== null) {
        setOpenNoteIndex(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [openNoteIndex]);

  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;
  const flashcardCount = topicConcepts.length * 2;

  const fallbackLoader = (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="animate-spin" size={24} style={{ color: "#c4a46a" }} />
    </div>
  );

  // Study mode tabs
  const StudyModeTabs = () => (
    <div className="flex gap-0.5 rounded-xl p-1"
      style={{ background: "rgba(15,13,10,0.9)", border: "1px solid rgba(196,164,106,0.1)", backdropFilter: "blur(12px)" }}>
      {[
        { key: "map" as const, icon: Map, label: "Mapa" },
        { key: "notes" as const, icon: ClipboardList, label: "Notas" },
        { key: "flashcards" as const, icon: Layers, label: "Flashcards", badge: flashcardCount },
        { key: "review" as const, icon: Eye, label: "Revisão" },
      ].map(tab => (
        <button
          key={tab.key}
          onClick={() => setStudyMode(tab.key)}
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

  // Non-map study modes
  if (studyMode !== "map") {
    const ViewComponent = studyMode === "flashcards" ? StudyFlashcardView
      : studyMode === "notes" ? StudyNotesListView
      : StudyRevealView;
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
            <ViewComponent analysis={analysis} onBack={() => setStudyMode("map")} />
          </Suspense>
        </div>
      </div>
    );
  }

  // Map mode
  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 shrink-0"
        style={{ borderBottom: "1px solid rgba(196,164,106,0.1)" }}>
        <StudyModeTabs />
        <button onClick={onClose} className="p-2 rounded-lg transition-colors" style={{ color: "#8a7d6a" }}>
          <X size={16} />
        </button>
      </div>

      {/* Map + NotePanel */}
      <div className="flex flex-1 min-h-0">
        {/* Canvas */}
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

            {/* Toolbar */}
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

        {/* NotePanel - Desktop */}
        {openNoteIndex !== null && (
          <NotePanel
            concept={topicConcepts[openNoteIndex] || null}
            concepts={topicConcepts}
            currentIndex={openNoteIndex}
            onNavigate={(idx) => setOpenNoteIndex(idx)}
            onClose={() => setOpenNoteIndex(null)}
          />
        )}
      </div>

      {/* Presentation Mode */}
      {showPresentation && (
        <PresentationMode analysis={analysis} onExit={() => setShowPresentation(false)} />
      )}

      {/* Share Dialog */}
      {showShareDialog && (
        <ShareDialog
          mapId=""
          title={analysis.main_theme || "Mapa Mental"}
          isPublic={shareState.isPublic}
          publicSlug={shareState.slug}
          onClose={() => setShowShareDialog(false)}
          onUpdate={(isPublic, slug) => setShareState({ isPublic, slug })}
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
