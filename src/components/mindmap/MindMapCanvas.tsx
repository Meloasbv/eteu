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
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import {
  ArrowLeftRight, ArrowUpDown, X,
  BookOpen, Heart, Flame, Crown, Shield, Globe, Users,
  Scroll, Star, Sword, Mountain, Waves, Sun, Anchor,
  Scale, Lightbulb, Cross, ChevronDown, ChevronRight,
  Maximize,
} from "lucide-react";
import type { AnalysisResult } from "./types";

const iconMap: Record<string, React.ElementType> = {
  "book-open": BookOpen, heart: Heart, flame: Flame, crown: Crown,
  shield: Shield, globe: Globe, users: Users, scroll: Scroll,
  star: Star, sword: Sword, mountain: Mountain, waves: Waves,
  sun: Sun, anchor: Anchor, scale: Scale, lightbulb: Lightbulb,
  cross: Cross,
};

const categoryColors: Record<string, { border: string; bg: string; text: string }> = {
  teologia:    { border: "#c9a067", bg: "rgba(201,160,103,0.12)", text: "#c9a067" },
  contexto:    { border: "#8b9e7a", bg: "rgba(139,158,122,0.12)", text: "#8b9e7a" },
  "aplicação": { border: "#7ba3c9", bg: "rgba(123,163,201,0.12)", text: "#7ba3c9" },
  personagem:  { border: "#d4854a", bg: "rgba(212,133,74,0.12)",  text: "#d4854a" },
  lugar:       { border: "#6a9c8a", bg: "rgba(106,156,138,0.12)", text: "#6a9c8a" },
  evento:      { border: "#b08db5", bg: "rgba(176,141,181,0.12)", text: "#b08db5" },
};

// ── Custom Nodes (with handles for connections) ──

function RootNode({ data }: { data: { label: string } }) {
  return (
    <div className="px-8 py-6 rounded-[24px] text-center min-w-[240px] relative"
      style={{
        background: "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--background-secondary)) 100%)",
        border: "2px solid hsl(var(--primary))",
        boxShadow: "0 0 40px hsl(var(--primary) / 0.12), 0 4px 20px rgba(0,0,0,0.15)",
      }}>
      <Handle type="source" position={Position.Bottom} style={{ background: "hsl(var(--primary))", width: 8, height: 8, border: "2px solid hsl(var(--background))" }} />
      <Handle type="source" position={Position.Right} style={{ background: "hsl(var(--primary))", width: 8, height: 8, border: "2px solid hsl(var(--background))" }} />
      <p className="font-display text-xl font-bold text-foreground tracking-wide">{data.label}</p>
    </div>
  );
}

function BranchNode({ data }: { data: { label: string; category?: string } }) {
  const cat = data.category ? categoryColors[data.category] : null;
  return (
    <div className="px-6 py-4 rounded-[16px] min-w-[180px] max-w-[260px] transition-all hover:shadow-lg relative"
      style={{
        background: cat ? cat.bg : "hsl(var(--card))",
        border: `1.5px solid ${cat ? cat.border + "60" : "hsl(var(--primary) / 0.3)"}`,
        borderLeft: cat ? `4px solid ${cat.border}` : undefined,
      }}>
      <Handle type="target" position={Position.Top} style={{ background: "hsl(var(--primary) / 0.5)", width: 6, height: 6 }} />
      <Handle type="target" position={Position.Left} style={{ background: "hsl(var(--primary) / 0.5)", width: 6, height: 6 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: "hsl(var(--primary) / 0.5)", width: 6, height: 6 }} />
      <Handle type="source" position={Position.Right} style={{ background: "hsl(var(--primary) / 0.5)", width: 6, height: 6 }} />
      <p className="font-display text-[15px] font-semibold leading-snug"
        style={{ color: cat ? cat.text : "hsl(var(--foreground) / 0.85)" }}>
        {data.label}
      </p>
    </div>
  );
}

function LeafNode({ data }: { data: { label: string; category?: string } }) {
  const cat = data.category ? categoryColors[data.category] : null;
  return (
    <div className="px-4 py-3 rounded-[12px] min-w-[140px] max-w-[220px] relative"
      style={{
        background: cat ? cat.bg : "hsl(var(--card) / 0.8)",
        border: `1px solid ${cat ? cat.border + "30" : "hsl(var(--primary) / 0.15)"}`,
        borderLeft: cat ? `3px solid ${cat.border}` : undefined,
      }}>
      <Handle type="target" position={Position.Top} style={{ background: "hsl(var(--muted-foreground) / 0.3)", width: 5, height: 5 }} />
      <Handle type="target" position={Position.Left} style={{ background: "hsl(var(--muted-foreground) / 0.3)", width: 5, height: 5 }} />
      <p className="font-ui text-[13px] leading-relaxed"
        style={{ color: cat ? cat.text : "hsl(var(--muted-foreground))" }}>
        {data.label}
      </p>
    </div>
  );
}

function StudyCardNode({ data }: { data: { title: string; description: string; category: string; icon?: string; refs?: string[] } }) {
  const cat = categoryColors[data.category] || categoryColors.teologia;
  const Icon = iconMap[data.icon || "book-open"] || BookOpen;
  return (
    <div className="w-[280px] min-h-[130px] rounded-[16px] p-5 transition-all hover:shadow-2xl cursor-grab active:cursor-grabbing relative"
      style={{
        background: "hsl(var(--card))",
        border: `1px solid ${cat.border}30`,
        borderLeft: `4px solid ${cat.border}`,
        boxShadow: `0 4px 16px rgba(0,0,0,0.15), 0 0 0 1px ${cat.border}10`,
      }}>
      <Handle type="target" position={Position.Top} style={{ background: cat.border, width: 6, height: 6 }} />
      <Handle type="target" position={Position.Left} style={{ background: cat.border, width: 6, height: 6 }} />
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: cat.bg }}>
          <Icon size={14} style={{ color: cat.text }} />
        </div>
        <p className="font-display text-[15px] font-semibold text-foreground flex-1">{data.title}</p>
      </div>
      <p className="font-ui text-[12.5px] leading-relaxed mb-3" style={{ color: "hsl(var(--muted-foreground))" }}>
        {data.description}
      </p>
      {data.refs && data.refs.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {data.refs.map((ref, i) => (
            <span key={i} className="px-2 py-0.5 rounded-md text-[10px] font-ui"
              style={{ background: cat.bg, color: cat.text, border: `1px solid ${cat.border}30` }}>
              {ref}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

const nodeTypes = { root: RootNode, branch: BranchNode, leaf: LeafNode, studyCard: StudyCardNode };

const defaultEdgeOptions = {
  type: "smoothstep" as const,
  animated: false,
  style: { stroke: "hsl(var(--primary) / 0.2)", strokeWidth: 1.5 },
  markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(var(--primary) / 0.35)", width: 14, height: 14 },
};

// ── Layout ──

function getLayoutedElements(nodes: Node[], edges: Edge[], direction = "TB") {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 80, ranksep: 100, marginx: 60, marginy: 60 });

  nodes.forEach(node => {
    const w = node.type === "studyCard" ? 280 : node.type === "root" ? 260 : node.type === "branch" ? 200 : 180;
    const h = node.type === "studyCard" ? 160 : node.type === "root" ? 90 : node.type === "branch" ? 70 : 55;
    g.setNode(node.id, { width: w, height: h });
  });
  edges.forEach(edge => g.setEdge(edge.source, edge.target));
  dagre.layout(g);

  return {
    nodes: nodes.map(node => {
      const pos = g.node(node.id);
      const w = node.type === "studyCard" ? 280 : node.type === "root" ? 260 : node.type === "branch" ? 200 : 180;
      const h = node.type === "studyCard" ? 160 : node.type === "root" ? 90 : node.type === "branch" ? 70 : 55;
      return { ...node, position: { x: pos.x - w / 2, y: pos.y - h / 2 } };
    }),
    edges,
  };
}

// ── Build graph with auto-interlinking ──

function buildFromAnalysis(analysis: AnalysisResult) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let nodeId = 0;

  // Root
  const rootId = `node-${nodeId++}`;
  nodes.push({ id: rootId, type: "root", position: { x: 0, y: 0 }, data: { label: analysis.hierarchy.root.label } });

  // Track branch nodes by label for interlinking
  const labelToNodeId: Record<string, string> = {};

  const addChildren = (parentId: string, children: any[], depth: number) => {
    children?.forEach(child => {
      const id = `node-${nodeId++}`;
      const type = depth === 1 ? "branch" : "leaf";
      // Try to find a matching concept category
      const matchingConcept = analysis.key_concepts?.find(c =>
        child.label.toLowerCase().includes(c.title.toLowerCase()) ||
        c.title.toLowerCase().includes(child.label.toLowerCase())
      );
      nodes.push({
        id, type, position: { x: 0, y: 0 },
        data: { label: child.label, category: matchingConcept?.category },
      });
      edges.push({ id: `edge-${parentId}-${id}`, source: parentId, target: id });
      labelToNodeId[child.label.toLowerCase()] = id;
      if (child.children?.length) addChildren(id, child.children, depth + 1);
    });
  };
  addChildren(rootId, analysis.hierarchy.root.children, 1);

  // Study cards
  const cardIds: string[] = [];
  analysis.key_concepts?.forEach((concept, i) => {
    const id = `card-${i}`;
    cardIds.push(id);
    nodes.push({
      id, type: "studyCard", position: { x: 0, y: 0 },
      data: {
        title: concept.title,
        description: concept.description,
        category: concept.category,
        icon: concept.icon_suggestion,
        refs: concept.bible_refs,
      },
    });

    // Auto-interlink: connect card to matching branch/leaf node
    const conceptLower = concept.title.toLowerCase();
    for (const [label, nid] of Object.entries(labelToNodeId)) {
      if (label.includes(conceptLower) || conceptLower.includes(label)) {
        edges.push({
          id: `link-${nid}-${id}`,
          source: nid,
          target: id,
          animated: true,
          style: { stroke: categoryColors[concept.category]?.border || "hsl(var(--primary) / 0.3)", strokeWidth: 1, strokeDasharray: "6 3" },
        });
        break;
      }
    }
  });

  // Cross-link cards sharing bible refs
  for (let i = 0; i < cardIds.length; i++) {
    for (let j = i + 1; j < cardIds.length; j++) {
      const refsA = analysis.key_concepts[i]?.bible_refs || [];
      const refsB = analysis.key_concepts[j]?.bible_refs || [];
      const shared = refsA.some(r => refsB.includes(r));
      if (shared) {
        edges.push({
          id: `cross-${cardIds[i]}-${cardIds[j]}`,
          source: cardIds[i],
          target: cardIds[j],
          animated: true,
          style: { stroke: "hsl(var(--primary) / 0.15)", strokeWidth: 1, strokeDasharray: "4 4" },
        });
      }
    }
  }

  return getLayoutedElements(nodes, edges);
}

// ── Component ──

interface Props {
  analysis: AnalysisResult;
  onClose: () => void;
}

export default function MindMapCanvas({ analysis, onClose }: Props) {
  const [direction, setDirection] = useState<"TB" | "LR">("LR"); // LR default for desktop
  const [showNotes, setShowNotes] = useState(true); // auto-open on desktop

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

  // Detect desktop
  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;

  return (
    <div className="flex h-full w-full animate-fade-in">
      {/* Notes panel (desktop — always visible, richer) */}
      {showNotes && (
        <div className="hidden lg:flex lg:flex-col w-[340px] h-full overflow-y-auto border-r shrink-0"
          style={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border) / 0.4)" }}>
          <div className="p-6 flex-1">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <p className="text-[9px] tracking-[2px] uppercase text-primary/60 font-ui">
                📋 Notas Estruturadas
              </p>
              <button onClick={() => setShowNotes(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={14} />
              </button>
            </div>

            {/* Theme */}
            <h3 className="font-display text-lg font-bold text-foreground mb-2 leading-tight">{analysis.main_theme}</h3>
            <p className="text-[13px] text-muted-foreground font-body leading-relaxed mb-6">{analysis.summary}</p>

            {/* Sections */}
            {analysis.structured_notes?.map((section, i) => (
              <NoteSection key={i} title={section.section_title} points={section.points} />
            ))}

            <div className="h-px my-5" style={{ background: "hsl(var(--border) / 0.2)" }} />

            {/* Keywords */}
            <p className="text-[10px] uppercase tracking-[2px] text-primary/60 font-ui mb-3">🏷️ Keywords</p>
            <div className="flex flex-wrap gap-1.5 mb-5">
              {analysis.keywords?.map((kw, i) => (
                <span key={i} className="px-2.5 py-1 rounded-lg text-[11px] font-ui font-medium transition-all hover:scale-105 cursor-default"
                  style={{
                    background: "hsl(var(--primary) / 0.08)",
                    border: "1px solid hsl(var(--primary) / 0.15)",
                    color: "hsl(var(--primary))",
                  }}>
                  {kw}
                </span>
              ))}
            </div>

            {/* Refs */}
            <p className="text-[10px] uppercase tracking-[2px] text-primary/60 font-ui mb-3">📖 Referências Bíblicas</p>
            <div className="flex flex-wrap gap-2">
              {analysis.key_concepts?.flatMap(c => c.bible_refs || []).filter((v, i, a) => a.indexOf(v) === i).map((ref, i) => (
                <span key={i} className="px-2 py-0.5 rounded text-[11px] italic font-body"
                  style={{ color: "hsl(var(--primary))", background: "hsl(var(--primary) / 0.06)" }}>
                  {ref}
                </span>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-6">
              <p className="text-[10px] uppercase tracking-[2px] text-muted-foreground/50 font-ui mb-2">Legenda</p>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(categoryColors).map(([cat, colors]) => (
                  <div key={cat} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ background: colors.border }} />
                    <span className="text-[10px] font-ui capitalize" style={{ color: colors.text }}>{cat}</span>
                  </div>
                ))}
              </div>
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
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.15}
          maxZoom={2.5}
          className="bg-background"
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="hsl(var(--border) / 0.2)" />
          <MiniMap
            nodeColor={(n) => {
              if (n.type === "root") return "hsl(var(--primary))";
              if (n.type === "studyCard") {
                const cat = (n.data as any)?.category;
                return categoryColors[cat]?.border || "hsl(var(--primary) / 0.5)";
              }
              return "hsl(var(--muted-foreground) / 0.2)";
            }}
            style={{
              background: "hsl(var(--card) / 0.9)",
              border: "1px solid hsl(var(--border) / 0.3)",
              borderRadius: 12,
            }}
            pannable
            zoomable
          />
          <Controls
            style={{
              background: "hsl(var(--card) / 0.95)",
              border: "1px solid hsl(var(--border) / 0.3)",
              borderRadius: 12,
              backdropFilter: "blur(8px)",
            }}
          />

          {/* Toolbar */}
          <Panel position="top-center">
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl shadow-lg"
              style={{
                background: "hsl(var(--card) / 0.95)",
                border: "1px solid hsl(var(--border) / 0.3)",
                backdropFilter: "blur(12px)",
              }}>
              <ToolbarBtn icon={ArrowUpDown} label="Vertical" active={direction === "TB"} onClick={() => onLayout("TB")} />
              <ToolbarBtn icon={ArrowLeftRight} label="Horizontal" active={direction === "LR"} onClick={() => onLayout("LR")} />
              <div className="w-px h-5 mx-1" style={{ background: "hsl(var(--border) / 0.3)" }} />
              <ToolbarBtn icon={Scroll} label={showNotes ? "Ocultar Notas" : "Mostrar Notas"} active={showNotes} onClick={() => setShowNotes(!showNotes)} />
              <div className="w-px h-5 mx-1" style={{ background: "hsl(var(--border) / 0.3)" }} />
              <ToolbarBtn icon={X} label="Fechar" onClick={onClose} />
            </div>
          </Panel>
        </ReactFlow>

        {/* Mobile notes bottom sheet */}
        <div className="lg:hidden absolute bottom-4 left-4 right-4 z-10">
          {!showNotes && (
            <button onClick={() => setShowNotes(true)}
              className="w-full py-3 rounded-2xl text-[12px] font-ui font-medium shadow-lg"
              style={{
                background: "hsl(var(--card) / 0.95)",
                border: "1px solid hsl(var(--border) / 0.3)",
                color: "hsl(var(--primary))",
                backdropFilter: "blur(12px)",
              }}>
              📋 Ver Notas
            </button>
          )}
          {showNotes && (
            <div className="rounded-2xl p-4 max-h-[45vh] overflow-y-auto animate-fade-in shadow-xl"
              style={{
                background: "hsl(var(--card) / 0.98)",
                border: "1px solid hsl(var(--border) / 0.3)",
                backdropFilter: "blur(16px)",
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
              <div className="h-px my-3" style={{ background: "hsl(var(--border) / 0.2)" }} />
              <div className="flex flex-wrap gap-1">
                {analysis.keywords?.map((kw, i) => (
                  <span key={i} className="px-2 py-0.5 rounded text-[10px] font-ui"
                    style={{ background: "hsl(var(--primary) / 0.08)", color: "hsl(var(--primary))" }}>
                    {kw}
                  </span>
                ))}
              </div>
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
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-ui font-medium transition-all active:scale-95"
      style={{
        background: active ? "hsl(var(--primary) / 0.12)" : "transparent",
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
    <div className="mb-4">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-[14px] font-display font-semibold w-full text-left transition-colors hover:opacity-80"
        style={{ color: "hsl(var(--primary))" }}>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {title}
      </button>
      {open && (
        <ul className="mt-2 space-y-1.5 pl-5" style={{ borderLeft: "2px solid hsl(var(--primary) / 0.1)" }}>
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
