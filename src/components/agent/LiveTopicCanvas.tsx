import { useCallback, useEffect, useMemo, useRef } from "react";
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
import { BookOpen } from "lucide-react";
import type { DetectedTopic } from "./types";

/**
 * Canvas leve para o RecordingView — exibe tópicos detectados ao vivo
 * como nós arrastáveis e permite ligar pontos manualmente.
 *
 * - Não persiste sozinho. O componente pai recebe atualizações via
 *   onLayoutChange e congela posições/conexões na sessão final.
 */

interface LiveCanvasProps {
  topics: DetectedTopic[];
  liveTopicId: string | null;
  positions: Record<string, { x: number; y: number }>;
  edges: Edge[];
  onPositionsChange: (next: Record<string, { x: number; y: number }>) => void;
  onEdgesChange: (next: Edge[]) => void;
}

const handleStyle = {
  width: 10, height: 10,
  background: "rgba(196,164,106,0.5)",
  border: "2px solid rgba(196,164,106,0.7)",
  borderRadius: "50%",
  opacity: 0,
  transition: "opacity 0.15s ease",
};

const edgeMarker = { type: MarkerType.ArrowClosed, width: 14, height: 14, color: "rgba(196,164,106,0.55)" };

function fmtSec(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

// ── Node ──
function TopicNode({ data }: NodeProps) {
  const d = data as Record<string, any>;
  const isLive = d.isLive as boolean;
  const verses = (d.verses as string[]) || [];
  return (
    <div
      className="rounded-xl px-3 py-2.5 group transition-all"
      style={{
        minWidth: 170,
        maxWidth: 220,
        background: isLive
          ? "linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--card)))"
          : "hsl(var(--card))",
        border: `1px solid ${isLive ? "hsl(var(--primary) / 0.6)" : "hsl(var(--border))"}`,
        borderLeft: `3px solid hsl(var(--primary))`,
        boxShadow: isLive
          ? "0 0 0 2px hsl(var(--primary) / 0.15), 0 4px 16px rgba(0,0,0,0.35)"
          : "0 2px 10px rgba(0,0,0,0.3)",
      }}
    >
      <Handle type="source" position={Position.Top} className="group-hover:!opacity-100" style={handleStyle} />
      <Handle type="source" position={Position.Bottom} className="group-hover:!opacity-100" style={handleStyle} />
      <Handle type="source" position={Position.Left} className="group-hover:!opacity-100" style={handleStyle} />
      <Handle type="source" position={Position.Right} className="group-hover:!opacity-100" style={handleStyle} />
      <Handle type="target" position={Position.Top} className="group-hover:!opacity-100" style={handleStyle} />
      <Handle type="target" position={Position.Bottom} className="group-hover:!opacity-100" style={handleStyle} />
      <Handle type="target" position={Position.Left} className="group-hover:!opacity-100" style={handleStyle} />
      <Handle type="target" position={Position.Right} className="group-hover:!opacity-100" style={handleStyle} />

      <div className="flex items-center gap-1 text-[9px] font-mono text-muted-foreground mb-1">
        <span>#{d.index}</span>
        <span>·</span>
        <span>{fmtSec(d.startTimestamp as number)}</span>
        {isLive && (
          <span className="ml-auto flex items-center gap-1 text-primary">
            <span className="w-1 h-1 rounded-full bg-primary animate-pulse" /> live
          </span>
        )}
      </div>
      <p className="font-display text-[12px] text-foreground leading-snug">{d.title as string}</p>
      {verses.length > 0 && (
        <div className="flex items-center gap-1 mt-1.5 text-[9px] text-primary/80">
          <BookOpen size={9} />
          <span className="font-mono">{verses.slice(0, 2).join(" · ")}{verses.length > 2 ? ` +${verses.length - 2}` : ""}</span>
        </div>
      )}
    </div>
  );
}

const nodeTypes = { topicNode: TopicNode };

const defaultEdgeOptions = {
  type: "smoothstep" as const,
  style: { stroke: "rgba(196,164,106,0.4)", strokeWidth: 2 },
  markerEnd: edgeMarker,
};

// Posicionamento padrão em grid quando o usuário ainda não moveu
function defaultPos(idx: number) {
  const cols = 2;
  const colW = 230;
  const rowH = 110;
  const col = idx % cols;
  const row = Math.floor(idx / cols);
  return { x: col * colW + (row % 2 === 0 ? 0 : 30), y: row * rowH };
}

function CanvasInner({
  topics, liveTopicId, positions, edges: incomingEdges,
  onPositionsChange, onEdgesChange,
}: LiveCanvasProps) {
  const initialNodes = useMemo<Node[]>(() => topics.map((t, i) => ({
    id: t.id,
    type: "topicNode",
    position: positions[t.id] || defaultPos(i),
    data: {
      title: t.title,
      index: i + 1,
      startTimestamp: t.startTimestamp,
      isLive: t.id === liveTopicId,
      verses: t.verses,
    },
  })), []); // eslint-disable-line react-hooks/exhaustive-deps

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChangeRF] = useEdgesState(incomingEdges);

  // Sync quando lista de tópicos cresce (novo tópico do agente)
  useEffect(() => {
    setNodes((curr) => {
      const byId = new Map(curr.map((n) => [n.id, n]));
      const next: Node[] = topics.map((t, i) => {
        const existing = byId.get(t.id);
        const data = {
          title: t.title,
          index: i + 1,
          startTimestamp: t.startTimestamp,
          isLive: t.id === liveTopicId,
          verses: t.verses,
        };
        if (existing) {
          return { ...existing, data };
        }
        return {
          id: t.id,
          type: "topicNode",
          position: positions[t.id] || defaultPos(i),
          data,
        };
      });
      return next;
    });
  }, [topics, liveTopicId, positions, setNodes]);

  // Sync edges externos
  useEffect(() => { setEdges(incomingEdges); }, [incomingEdges, setEdges]);

  const onConnect = useCallback((c: Connection) => {
    setEdges((es) => {
      const next = addEdge({ ...c, ...defaultEdgeOptions }, es);
      onEdgesChange(next);
      return next;
    });
  }, [setEdges, onEdgesChange]);

  const handleNodesChange = useCallback((changes: any) => {
    onNodesChange(changes);
    // Propaga novas posições só ao terminar drag
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
      fitViewOptions={{ padding: 0.4 }}
      proOptions={{ hideAttribution: true }}
      minZoom={0.3}
      maxZoom={1.4}
      panOnDrag
      zoomOnScroll
    >
      <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="rgba(196,164,106,0.10)" />
    </ReactFlow>
  );
}

export default function LiveTopicCanvas(props: LiveCanvasProps) {
  return (
    <div className="w-full h-full bg-background">
      <ReactFlowProvider>
        <CanvasInner {...props} />
      </ReactFlowProvider>
    </div>
  );
}
