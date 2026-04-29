import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
  MarkerType,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { BookOpen, Pencil } from "lucide-react";
import type { DetectedTopic } from "./types";

/**
 * Canvas ao vivo — cada bloco de fala vira um "card de resumo" rico:
 *   #idx · MM:SS  ·  live ●
 *   Título display
 *   Resumo curto (serif itálico)
 *   📖 versículos
 *
 * Editável: clicar no ícone do título permite renomear o tópico ou editar o resumo.
 * Conectável: arrastar entre handles cria edges curvas.
 */

interface LiveCanvasProps {
  topics: DetectedTopic[];
  liveTopicId: string | null;
  positions: Record<string, { x: number; y: number }>;
  edges: Edge[];
  onPositionsChange: (next: Record<string, { x: number; y: number }>) => void;
  onEdgesChange: (next: Edge[]) => void;
  onTopicEdit?: (id: string, patch: Partial<DetectedTopic>) => void;
}

const handleStyle = {
  width: 8, height: 8,
  background: "hsl(var(--primary) / 0.5)",
  border: "1.5px solid hsl(var(--primary) / 0.7)",
  borderRadius: "50%",
  opacity: 0,
  transition: "opacity 0.18s ease",
};

const edgeMarker = { type: MarkerType.ArrowClosed, width: 12, height: 12, color: "hsl(var(--primary) / 0.45)" };

function fmtSec(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

// ── Node ──
function TopicNode({ data, id }: NodeProps) {
  const d = data as Record<string, any>;
  const isLive = d.isLive as boolean;
  const verses = (d.verses as string[]) || [];
  const onEdit = d.onEdit as ((patch: Partial<DetectedTopic>) => void) | undefined;
  const [editing, setEditing] = useState<null | "title" | "summary">(null);
  const [titleDraft, setTitleDraft] = useState<string>(d.title || "");
  const [summaryDraft, setSummaryDraft] = useState<string>(d.summary || "");

  useEffect(() => { setTitleDraft(d.title || ""); }, [d.title]);
  useEffect(() => { setSummaryDraft(d.summary || ""); }, [d.summary]);

  const commitTitle = () => {
    if (titleDraft.trim() && titleDraft.trim() !== d.title) {
      onEdit?.({ title: titleDraft.trim() });
    }
    setEditing(null);
  };
  const commitSummary = () => {
    if (summaryDraft.trim() !== (d.summary || "")) {
      onEdit?.({ summary: summaryDraft.trim(), keyPoints: summaryDraft.trim() ? [summaryDraft.trim()] : [] });
    }
    setEditing(null);
  };

  return (
    <div
      className="rounded-2xl group transition-all relative overflow-hidden"
      style={{
        minWidth: 230,
        maxWidth: 280,
        background: isLive
          ? "linear-gradient(155deg, hsl(var(--primary) / 0.13), hsl(var(--card)) 55%)"
          : "hsl(var(--card) / 0.85)",
        border: `1px solid ${isLive ? "hsl(var(--primary) / 0.55)" : "hsl(var(--border) / 0.8)"}`,
        boxShadow: isLive
          ? "0 0 0 3px hsl(var(--primary) / 0.10), 0 8px 24px -6px hsl(var(--primary) / 0.35)"
          : "0 4px 14px -4px rgba(0,0,0,0.45)",
        backdropFilter: "blur(2px)",
      }}
    >
      {/* Side accent */}
      <span
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{
          background: isLive
            ? "linear-gradient(180deg, hsl(var(--primary)), hsl(var(--primary) / 0.4))"
            : "hsl(var(--primary) / 0.55)",
        }}
      />

      {/* Index badge — large editorial */}
      <div className="absolute top-2 right-2 font-display text-[28px] leading-none text-primary/15 select-none pointer-events-none">
        {String(d.index).padStart(2, "0")}
      </div>

      {/* Handles */}
      {(["Top", "Bottom", "Left", "Right"] as const).map((p) => (
        <Handle key={`s-${p}`} type="source" position={Position[p]} className="group-hover:!opacity-100" style={handleStyle} />
      ))}
      {(["Top", "Bottom", "Left", "Right"] as const).map((p) => (
        <Handle key={`t-${p}`} type="target" position={Position[p]} className="group-hover:!opacity-100" style={handleStyle} />
      ))}

      <div className="px-3.5 pt-2.5 pb-3 relative">
        {/* meta */}
        <div className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-[1.5px] text-muted-foreground/80 mb-1.5">
          <span>{fmtSec(d.startTimestamp as number)}</span>
          {isLive && (
            <span className="flex items-center gap-1 text-primary normal-case tracking-normal font-sans font-bold">
              <span className="w-1 h-1 rounded-full bg-primary animate-pulse" /> ao vivo
            </span>
          )}
        </div>

        {/* title */}
        {editing === "title" ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitTitle();
              if (e.key === "Escape") { setTitleDraft(d.title || ""); setEditing(null); }
            }}
            className="w-full bg-transparent border-b border-primary/40 outline-none font-display text-[13px] text-foreground leading-snug pb-0.5"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div className="flex items-start gap-1 group/title">
            <p
              className="font-display text-[13px] text-foreground leading-snug flex-1 cursor-text"
              onDoubleClick={() => setEditing("title")}
            >
              {d.title as string}
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); setEditing("title"); }}
              className="opacity-0 group-hover/title:opacity-60 hover:!opacity-100 text-muted-foreground"
              title="Renomear"
            >
              <Pencil size={9} />
            </button>
          </div>
        )}

        {/* summary */}
        {editing === "summary" ? (
          <textarea
            autoFocus
            value={summaryDraft}
            onChange={(e) => setSummaryDraft(e.target.value)}
            onBlur={commitSummary}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commitSummary();
              if (e.key === "Escape") { setSummaryDraft(d.summary || ""); setEditing(null); }
            }}
            className="w-full mt-1.5 bg-card/60 border border-primary/30 rounded p-1.5 text-[11px] text-foreground outline-none resize-none"
            rows={3}
            onClick={(e) => e.stopPropagation()}
          />
        ) : d.summary ? (
          <p
            className="text-[11px] text-muted-foreground leading-snug mt-1.5 italic cursor-text hover:text-foreground/90 transition-colors"
            style={{ fontFamily: "'Crimson Text', Georgia, serif" }}
            onDoubleClick={() => setEditing("summary")}
            title="Duplo clique para editar"
          >
            {String(d.summary)}
          </p>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); setEditing("summary"); }}
            className="text-[10px] italic text-muted-foreground/50 mt-1.5 hover:text-primary"
          >
            + adicionar resumo
          </button>
        )}

        {/* verses */}
        {verses.length > 0 && (
          <div className="flex items-center flex-wrap gap-1 mt-2.5 pt-2 border-t border-border/40">
            <BookOpen size={9} className="text-primary/70" />
            {verses.slice(0, 3).map((v) => (
              <span
                key={v}
                className="text-[9px] px-1.5 py-0.5 rounded font-mono text-primary"
                style={{ background: "hsl(var(--primary) / 0.08)", border: "1px solid hsl(var(--primary) / 0.18)" }}
              >
                {v}
              </span>
            ))}
            {verses.length > 3 && (
              <span className="text-[9px] text-muted-foreground/60 font-mono">+{verses.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const nodeTypes = { topicNode: TopicNode };

const defaultEdgeOptions = {
  type: "smoothstep" as const,
  style: { stroke: "hsl(var(--primary) / 0.35)", strokeWidth: 1.5, strokeDasharray: "0" },
  markerEnd: edgeMarker,
};

// Layout vertical empilhado — leitura natural top-down (ordem cronológica).
function defaultPos(idx: number) {
  const colW = 320;
  const rowH = 160;
  // Zigzag suave entre duas colunas para sensação de fluxo
  const col = idx % 2;
  return { x: col * colW - colW / 2, y: idx * rowH };
}

function CanvasInner({
  topics, liveTopicId, positions, edges: incomingEdges,
  onPositionsChange, onEdgesChange, onTopicEdit,
}: LiveCanvasProps) {
  const buildNode = useCallback((t: DetectedTopic, i: number): Node => ({
    id: t.id,
    type: "topicNode",
    position: positions[t.id] || defaultPos(i),
    data: {
      title: t.title,
      index: i + 1,
      startTimestamp: t.startTimestamp,
      isLive: t.id === liveTopicId,
      verses: t.verses,
      summary: t.summary,
      onEdit: (patch: Partial<DetectedTopic>) => onTopicEdit?.(t.id, patch),
    },
  }), [positions, liveTopicId, onTopicEdit]);

  const initialNodes = useMemo<Node[]>(() => topics.map(buildNode), []); // eslint-disable-line react-hooks/exhaustive-deps

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChangeRF] = useEdgesState(incomingEdges);

  // Sync quando lista/data muda
  useEffect(() => {
    setNodes((curr) => {
      const byId = new Map(curr.map((n) => [n.id, n]));
      return topics.map((t, i) => {
        const existing = byId.get(t.id);
        const data = {
          title: t.title,
          index: i + 1,
          startTimestamp: t.startTimestamp,
          isLive: t.id === liveTopicId,
          verses: t.verses,
          summary: t.summary,
          onEdit: (patch: Partial<DetectedTopic>) => onTopicEdit?.(t.id, patch),
        };
        if (existing) return { ...existing, data };
        return buildNode(t, i);
      });
    });
  }, [topics, liveTopicId, positions, setNodes, onTopicEdit, buildNode]);

  useEffect(() => { setEdges(incomingEdges); }, [incomingEdges, setEdges]);

  const onConnect = useCallback((c: Connection) => {
    setEdges((es) => {
      const next = addEdge({ ...c, ...defaultEdgeOptions, animated: true }, es);
      onEdgesChange(next);
      return next;
    });
  }, [setEdges, onEdgesChange]);

  const handleNodesChange = useCallback((changes: any) => {
    onNodesChange(changes);
    const dragEnd = changes.some((c: any) => c.type === "position" && c.dragging === false);
    if (dragEnd) {
      setNodes((curr) => {
        const next: Record<string, { x: number; y: number }> = {};
        curr.forEach((n) => { next[n.id] = { x: n.position.x, y: n.position.y }; });
        onPositionsChange(next);
        return curr;
      });
    }
  }, [onNodesChange, setNodes, onPositionsChange]);

  const handleEdgesChange = useCallback((changes: any) => {
    onEdgesChangeRF(changes);
    setEdges((curr) => {
      onEdgesChange(curr);
      return curr;
    });
  }, [onEdgesChangeRF, setEdges, onEdgesChange]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={handleNodesChange}
      onEdgesChange={handleEdgesChange}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      defaultEdgeOptions={defaultEdgeOptions}
      fitView
      fitViewOptions={{ padding: 0.35, maxZoom: 1 }}
      proOptions={{ hideAttribution: true }}
      minZoom={0.25}
      maxZoom={1.4}
      panOnDrag
      zoomOnScroll
    >
      <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="hsl(var(--primary) / 0.08)" />
    </ReactFlow>
  );
}

export default function LiveTopicCanvas(props: LiveCanvasProps) {
  return (
    <div className="w-full h-full" style={{ background: "radial-gradient(ellipse at top, hsl(var(--primary) / 0.04), transparent 60%), hsl(var(--background))" }}>
      <ReactFlowProvider>
        <CanvasInner {...props} />
      </ReactFlowProvider>
    </div>
  );
}
