import { useCallback, useMemo, useEffect, useState } from "react";
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
  ArrowLeftRight, ArrowUpDown, Maximize, Download, X,
  BookOpen, Heart, Flame, Crown, Shield, Globe, Users,
  Scroll, Star, Sword, Mountain, Waves, Sun, Anchor,
  Scale, Lightbulb, Cross, ChevronDown, ChevronRight,
} from "lucide-react";
import type { AnalysisResult } from "./types";

// Icon map
const iconMap: Record<string, React.ElementType> = {
  "book-open": BookOpen, heart: Heart, flame: Flame, crown: Crown,
  shield: Shield, globe: Globe, users: Users, scroll: Scroll,
  star: Star, sword: Sword, mountain: Mountain, waves: Waves,
  sun: Sun, anchor: Anchor, scale: Scale, lightbulb: Lightbulb,
  cross: Cross,
};

const categoryColors: Record<string, { border: string; bg: string; text: string }> = {
  teologia:   { border: "#c9a067", bg: "rgba(201,160,103,0.08)", text: "#c9a067" },
  contexto:   { border: "#8b9e7a", bg: "rgba(139,158,122,0.08)", text: "#8b9e7a" },
  "aplicação": { border: "#7ba3c9", bg: "rgba(123,163,201,0.08)", text: "#7ba3c9" },
  personagem: { border: "#d4854a", bg: "rgba(212,133,74,0.08)",  text: "#d4854a" },
  lugar:      { border: "#6a9c8a", bg: "rgba(106,156,138,0.08)", text: "#6a9c8a" },
  evento:     { border: "#b08db5", bg: "rgba(176,141,181,0.08)", text: "#b08db5" },
};

// Custom nodes
function RootNode({ data }: { data: { label: string } }) {
  return (
    <div className="px-7 py-5 rounded-[20px] text-center min-w-[200px]"
      style={{
        background: "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--background)) 100%)",
        border: "2px solid hsl(var(--primary))",
        boxShadow: "0 0 24px hsl(var(--primary) / 0.15)",
      }}>
      <p className="font-display text-lg font-bold text-foreground">{data.label}</p>
    </div>
  );
}

function BranchNode({ data }: { data: { label: string } }) {
  return (
    <div className="px-5 py-3.5 rounded-[14px] min-w-[160px] transition-all hover:shadow-lg"
      style={{
        background: "hsl(var(--card))",
        border: "1.5px solid hsl(var(--primary) / 0.3)",
      }}>
      <p className="font-display text-[15px] font-semibold" style={{ color: "hsl(var(--foreground) / 0.85)" }}>
        {data.label}
      </p>
    </div>
  );
}

function LeafNode({ data }: { data: { label: string } }) {
  return (
    <div className="px-3.5 py-2.5 rounded-[10px] min-w-[120px] max-w-[200px]"
      style={{
        background: "hsl(var(--card) / 0.8)",
        border: "1px solid hsl(var(--primary) / 0.15)",
      }}>
      <p className="font-ui text-[12.5px]" style={{ color: "hsl(var(--muted-foreground))" }}>
        {data.label}
      </p>
    </div>
  );
}

function StudyCardNode({ data }: { data: { title: string; description: string; category: string; icon?: string; refs?: string[] } }) {
  const cat = categoryColors[data.category] || categoryColors.teologia;
  const Icon = iconMap[data.icon || "book-open"] || BookOpen;
  return (
    <div className="w-[260px] min-h-[120px] rounded-[14px] p-4 transition-all hover:shadow-xl cursor-grab active:cursor-grabbing"
      style={{
        background: "hsl(var(--card))",
        border: "1px solid hsl(var(--primary) / 0.2)",
        borderLeft: `3px solid ${cat.border}`,
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} style={{ color: cat.text }} />
        <p className="font-display text-[15px] font-semibold text-foreground">{data.title}</p>
      </div>
      <p className="font-ui text-[12.5px] leading-relaxed mb-2" style={{ color: "hsl(var(--muted-foreground))" }}>
        {data.description}
      </p>
      {data.refs && data.refs.length > 0 && (
        <p className="font-body text-xs italic" style={{ color: "hsl(var(--primary))" }}>
          📌 {data.refs.join(" · ")}
        </p>
      )}
    </div>
  );
}

const nodeTypes = {
  root: RootNode,
  branch: BranchNode,
  leaf: LeafNode,
  studyCard: StudyCardNode,
};

const defaultEdgeOptions = {
  type: "smoothstep" as const,
  animated: false,
  style: { stroke: "hsl(var(--primary) / 0.25)", strokeWidth: 1.5 },
  markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(var(--primary) / 0.4)", width: 12, height: 12 },
};

// Layout with dagre
function getLayoutedElements(nodes: Node[], edges: Edge[], direction = "TB") {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 60, ranksep: 80, marginx: 40, marginy: 40 });

  nodes.forEach(node => {
    const w = node.type === "studyCard" ? 260 : node.type === "root" ? 220 : node.type === "branch" ? 180 : 160;
    const h = node.type === "studyCard" ? 140 : node.type === "root" ? 80 : 60;
    g.setNode(node.id, { width: w, height: h });
  });
  edges.forEach(edge => g.setEdge(edge.source, edge.target));
  dagre.layout(g);

  const layoutedNodes = nodes.map(node => {
    const pos = g.node(node.id);
    const w = node.type === "studyCard" ? 260 : node.type === "root" ? 220 : node.type === "branch" ? 180 : 160;
    const h = node.type === "studyCard" ? 140 : node.type === "root" ? 80 : 60;
    return { ...node, position: { x: pos.x - w / 2, y: pos.y - h / 2 } };
  });

  return { nodes: layoutedNodes, edges };
}

// Build nodes/edges from analysis
function buildFromAnalysis(analysis: AnalysisResult) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let nodeId = 0;

  // Root
  const rootId = `node-${nodeId++}`;
  nodes.push({ id: rootId, type: "root", position: { x: 0, y: 0 }, data: { label: analysis.hierarchy.root.label } });

  // Children
  const addChildren = (parentId: string, children: any[], depth: number) => {
    children?.forEach(child => {
      const id = `node-${nodeId++}`;
      const type = depth === 1 ? "branch" : "leaf";
      nodes.push({ id, type, position: { x: 0, y: 0 }, data: { label: child.label } });
      edges.push({ id: `edge-${parentId}-${id}`, source: parentId, target: id });
      if (child.children?.length) addChildren(id, child.children, depth + 1);
    });
  };
  addChildren(rootId, analysis.hierarchy.root.children, 1);

  // Study cards from key_concepts
  analysis.key_concepts?.forEach((concept, i) => {
    const id = `card-${i}`;
    nodes.push({
      id,
      type: "studyCard",
      position: { x: 0, y: 0 },
      data: {
        title: concept.title,
        description: concept.description,
        category: concept.category,
        icon: concept.icon_suggestion,
        refs: concept.bible_refs,
      },
    });
  });

  return getLayoutedElements(nodes, edges);
}

interface Props {
  analysis: AnalysisResult;
  onClose: () => void;
}

export default function MindMapCanvas({ analysis, onClose }: Props) {
  const [direction, setDirection] = useState<"TB" | "LR">("TB");
  const [showNotes, setShowNotes] = useState(false);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => buildFromAnalysis(analysis), [analysis]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onLayout = useCallback((dir: "TB" | "LR") => {
    setDirection(dir);
    const { nodes: ln, edges: le } = getLayoutedElements(nodes, edges, dir);
    setNodes([...ln]);
    setEdges([...le]);
  }, [nodes, edges, setNodes, setEdges]);

  useEffect(() => {
    const { nodes: ln, edges: le } = buildFromAnalysis(analysis);
    setNodes(ln);
    setEdges(le);
  }, [analysis]);

  return (
    <div className="flex h-full w-full animate-fade-in">
      {/* Notes panel (desktop) */}
      {showNotes && (
        <div className="hidden lg:block w-[320px] h-full overflow-y-auto border-r shrink-0"
          style={{
            background: "hsl(var(--background))",
            borderColor: "hsl(var(--border))",
          }}>
          <div className="p-5">
            <p className="text-[9px] tracking-[2px] uppercase text-primary/60 font-ui mb-4">
              📋 Notas Estruturadas
            </p>
            <h3 className="font-display text-base font-bold text-foreground mb-4">{analysis.main_theme}</h3>
            <p className="text-[13px] text-muted-foreground font-body leading-relaxed mb-6">{analysis.summary}</p>

            {analysis.structured_notes?.map((section, i) => (
              <NoteSection key={i} title={section.section_title} points={section.points} />
            ))}

            <div className="h-px my-4" style={{ background: "hsl(var(--border) / 0.3)" }} />

            <p className="text-[10px] uppercase tracking-[2px] text-primary/60 font-ui mb-2">🏷️ Keywords</p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {analysis.keywords?.map((kw, i) => (
                <span key={i} className="px-2.5 py-1 rounded-md text-[11px] font-ui font-medium"
                  style={{
                    background: "hsl(var(--primary) / 0.08)",
                    border: "1px solid hsl(var(--primary) / 0.2)",
                    color: "hsl(var(--primary))",
                  }}>
                  {kw}
                </span>
              ))}
            </div>

            <p className="text-[10px] uppercase tracking-[2px] text-primary/60 font-ui mb-2">📖 Referências</p>
            <div className="flex flex-wrap gap-1">
              {analysis.key_concepts?.flatMap(c => c.bible_refs || []).filter((v, i, a) => a.indexOf(v) === i).map((ref, i) => (
                <span key={i} className="text-xs italic font-body" style={{ color: "hsl(var(--primary))" }}>{ref}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 h-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.2}
          maxZoom={2}
          className="bg-background"
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="hsl(var(--border) / 0.3)" />
          <MiniMap
            nodeColor={(n) => {
              if (n.type === "root") return "hsl(var(--primary))";
              if (n.type === "studyCard") return "hsl(var(--primary) / 0.5)";
              return "hsl(var(--muted-foreground) / 0.3)";
            }}
            style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
          />
          <Controls
            style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }}
          />

          {/* Toolbar */}
          <Panel position="top-center">
            <div className="flex items-center gap-1 px-2 py-1.5 rounded-xl"
              style={{
                background: "hsl(var(--card) / 0.95)",
                border: "1px solid hsl(var(--border))",
                backdropFilter: "blur(8px)",
              }}>
              <ToolbarBtn icon={ArrowUpDown} label="Vertical" active={direction === "TB"} onClick={() => onLayout("TB")} />
              <ToolbarBtn icon={ArrowLeftRight} label="Horizontal" active={direction === "LR"} onClick={() => onLayout("LR")} />
              <div className="w-px h-5 mx-1" style={{ background: "hsl(var(--border))" }} />
              <ToolbarBtn icon={Scroll} label="Notas" active={showNotes} onClick={() => setShowNotes(!showNotes)} />
              <div className="w-px h-5 mx-1" style={{ background: "hsl(var(--border))" }} />
              <ToolbarBtn icon={X} label="Fechar" onClick={onClose} />
            </div>
          </Panel>
        </ReactFlow>

        {/* Mobile notes toggle */}
        <div className="lg:hidden absolute bottom-4 left-4 right-4">
          {showNotes && (
            <div className="rounded-2xl p-4 max-h-[40vh] overflow-y-auto animate-fade-in"
              style={{
                background: "hsl(var(--card) / 0.98)",
                border: "1px solid hsl(var(--border))",
                backdropFilter: "blur(12px)",
              }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] uppercase tracking-[2px] text-primary/60 font-ui">📋 Notas</p>
                <button onClick={() => setShowNotes(false)} className="text-muted-foreground hover:text-foreground">
                  <X size={16} />
                </button>
              </div>
              <h3 className="font-display text-sm font-bold text-foreground mb-2">{analysis.main_theme}</h3>
              <p className="text-xs text-muted-foreground font-body leading-relaxed mb-3">{analysis.summary}</p>
              {analysis.structured_notes?.map((s, i) => (
                <NoteSection key={i} title={s.section_title} points={s.points} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ToolbarBtn({ icon: Icon, label, active, onClick }: { icon: React.ElementType; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-ui transition-all active:scale-95"
      style={{
        background: active ? "hsl(var(--primary) / 0.1)" : "transparent",
        color: active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
      }}
    >
      <Icon size={14} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function NoteSection({ title, points }: { title: string; points: string[] }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-3">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-[14px] font-display font-semibold w-full text-left"
        style={{ color: "hsl(var(--primary))" }}>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {title}
      </button>
      {open && (
        <ul className="mt-1.5 space-y-1 pl-4" style={{ borderLeft: "2px solid hsl(var(--primary) / 0.1)" }}>
          {points.map((p, i) => (
            <li key={i} className="text-[13px] font-body leading-relaxed py-0.5"
              style={{ color: "hsl(var(--foreground) / 0.75)" }}>
              • {p}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
