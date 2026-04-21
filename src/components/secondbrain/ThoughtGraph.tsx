import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, SimulationNodeDatum, SimulationLinkDatum } from "d3-force";
import { Filter, X, Focus, ArrowLeft, Sparkles } from "lucide-react";

interface Thought {
  id: string;
  content: string;
  type: string;
  keywords: string[];
  created_at: string;
}

interface Connection {
  thought_a: string;
  thought_b: string;
  strength: number | null;
  connection_type: string;
  explanation: string | null;
  created_at: string;
}

interface GraphNode extends SimulationNodeDatum {
  id: string;
  type: string;
  content: string;
  connectionCount: number;
  created_at: string;
}

interface GraphLink extends SimulationLinkDatum<GraphNode> {
  strength: number;
  connection_type: string;
  explanation: string | null;
  created_at: string;
}

const TYPE_COLORS: Record<string, string> = {
  problema: "#e85d5d",
  insight: "#d4b347",
  estudo: "#5b9fd4",
  reflexão: "#b97ac4",
  oração: "#e8c87a",
  decisão: "#e89047",
  emocional: "#f08aa8",
  ideia: "#7fb069",
  pergunta: "#5cc4a8",
};

const TYPE_LABELS: Record<string, { emoji: string; label: string }> = {
  problema: { emoji: "🔴", label: "Problema" },
  insight: { emoji: "💡", label: "Insight" },
  estudo: { emoji: "📖", label: "Estudo" },
  reflexão: { emoji: "🪞", label: "Reflexão" },
  oração: { emoji: "🙏", label: "Oração" },
  decisão: { emoji: "⚖️", label: "Decisão" },
  emocional: { emoji: "💛", label: "Emocional" },
  ideia: { emoji: "💭", label: "Ideia" },
  pergunta: { emoji: "❓", label: "Pergunta" },
};

const CONN_TYPE_LABELS: Record<string, { emoji: string; label: string; color: string }> = {
  semantic:  { emoji: "🔗", label: "Semântica",   color: "#c4a46a" },
  emotional: { emoji: "💗", label: "Emocional",    color: "#f08aa8" },
  thematic:  { emoji: "📚", label: "Temática",     color: "#5b9fd4" },
  causal:    { emoji: "➡️", label: "Causal",       color: "#e89047" },
  recurring: { emoji: "🔄", label: "Recorrente",   color: "#b97ac4" },
};

const PERIODS = [
  { key: "week", label: "Semana" },
  { key: "month", label: "Mês" },
  { key: "3months", label: "3 Meses" },
  { key: "all", label: "Tudo" },
];

const RECENT_MS = 7 * 86400000; // 7 days

interface ThoughtGraphProps {
  userCodeId: string;
  /** "gold" (default), "neon" (Focus), or "area" (uses themeColor prop) */
  theme?: "gold" | "neon" | "area";
  /** Override accent color (used when theme="area") */
  themeColor?: string;
  /** Hide built-in filters/legend/sheets — host renders its own UI */
  embedded?: boolean;
  /** Notify parent when a node is clicked */
  onSelectNode?: (id: string) => void;
  /** Only these IDs render at full opacity (others become ghosts if in ghostIds) */
  filterIds?: Set<string>;
  /** IDs rendered as faded ghosts (no interaction) */
  ghostIds?: Set<string>;
}

export default function ThoughtGraph({ userCodeId, theme = "gold", themeColor, embedded = false, onSelectNode, filterIds, ghostIds }: ThoughtGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const nodesRef = useRef<GraphNode[]>([]);
  const linksRef = useRef<GraphLink[]>([]);
  const simRef = useRef<any>(null);
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });
  const dragRef = useRef<{ dragging: boolean; startX: number; startY: number; node: GraphNode | null; moved: boolean }>({
    dragging: false, startX: 0, startY: 0, node: null, moved: false,
  });
  const pulseRef = useRef(0);
  const animFrameRef = useRef<number>(0);

  useEffect(() => { loadData(); }, [userCodeId]);

  // Refresh when thought captured elsewhere (Brain Mode dock/drop)
  useEffect(() => {
    const onAdded = () => loadData();
    window.addEventListener("brain-thought-added", onAdded);
    return () => window.removeEventListener("brain-thought-added", onAdded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userCodeId]);

  const loadData = async () => {
    const [{ data: t }, { data: c }] = await Promise.all([
      supabase.from("thoughts").select("id, content, type, keywords, created_at, archived")
        .eq("user_code_id", userCodeId).eq("archived", false).order("created_at", { ascending: false }).limit(200),
      supabase.from("thought_connections").select("thought_a, thought_b, strength, connection_type, explanation, created_at")
        .eq("user_code_id", userCodeId).limit(800),
    ]);
    if (t) setThoughts(t.map(x => ({ ...x, keywords: (x.keywords as string[]) || [] })));
    if (c) setConnections(c as Connection[]);
  };

  // Compute focus subset (node + direct neighbors)
  const focusedIds = useMemo(() => {
    if (!focusNodeId) return null;
    const set = new Set<string>([focusNodeId]);
    connections.forEach(c => {
      if (c.thought_a === focusNodeId) set.add(c.thought_b);
      if (c.thought_b === focusNodeId) set.add(c.thought_a);
    });
    return set;
  }, [focusNodeId, connections]);

  const filteredThoughts = useMemo(() => {
    let result = thoughts;
    if (focusedIds) {
      result = result.filter(t => focusedIds.has(t.id));
    } else {
      if (filterType) result = result.filter(t => t.type === filterType);
      if (filterPeriod !== "all") {
        const now = Date.now();
        const ms = filterPeriod === "week" ? 7 * 86400000 : filterPeriod === "month" ? 30 * 86400000 : 90 * 86400000;
        result = result.filter(t => now - new Date(t.created_at).getTime() < ms);
      }
    }
    return result;
  }, [thoughts, filterType, filterPeriod, focusedIds]);

  // Connections relevant to the focused node (for side panel)
  const focusedConnections = useMemo(() => {
    if (!focusNodeId) return [];
    return connections
      .filter(c => c.thought_a === focusNodeId || c.thought_b === focusNodeId)
      .map(c => {
        const otherId = c.thought_a === focusNodeId ? c.thought_b : c.thought_a;
        const other = thoughts.find(t => t.id === otherId);
        return { ...c, other };
      })
      .filter(c => !!c.other)
      .sort((a, b) => (b.strength ?? 0) - (a.strength ?? 0));
  }, [focusNodeId, connections, thoughts]);

  const focusedThought = useMemo(
    () => focusNodeId ? thoughts.find(t => t.id === focusNodeId) : null,
    [focusNodeId, thoughts]
  );

  // Build graph + simulation
  useEffect(() => {
    if (!containerRef.current || filteredThoughts.length === 0) {
      nodesRef.current = [];
      linksRef.current = [];
      return;
    }

    const w = containerRef.current.clientWidth;
    const h = containerRef.current.clientHeight;

    const idSet = new Set(filteredThoughts.map(t => t.id));
    const connMap: Record<string, number> = {};
    const validLinks: GraphLink[] = [];

    connections.forEach(c => {
      if (idSet.has(c.thought_a) && idSet.has(c.thought_b)) {
        connMap[c.thought_a] = (connMap[c.thought_a] || 0) + 1;
        connMap[c.thought_b] = (connMap[c.thought_b] || 0) + 1;
        validLinks.push({
          source: c.thought_a,
          target: c.thought_b,
          strength: c.strength ?? 0.5,
          connection_type: c.connection_type || "semantic",
          explanation: c.explanation,
          created_at: c.created_at,
        });
      }
    });

    const nodes: GraphNode[] = filteredThoughts.map(t => ({
      id: t.id,
      type: t.type,
      content: t.content,
      connectionCount: connMap[t.id] || 0,
      created_at: t.created_at,
      x: w / 2 + (Math.random() - 0.5) * w * 0.6,
      y: h / 2 + (Math.random() - 0.5) * h * 0.6,
    }));

    nodesRef.current = nodes;
    linksRef.current = validLinks;

    if (simRef.current) simRef.current.stop();

    const sim = forceSimulation(nodes)
      .force("link", forceLink<GraphNode, GraphLink>(validLinks).id(d => d.id).distance(l => 80 + (1 - l.strength) * 80))
      .force("charge", forceManyBody().strength(focusedIds ? -250 : -150))
      .force("center", forceCenter(w / 2, h / 2))
      .force("collide", forceCollide(32))
      .alphaDecay(0.02)
      .on("tick", () => draw());

    simRef.current = sim;
    transformRef.current = { x: 0, y: 0, scale: 1 };

    return () => { sim.stop(); };
  }, [filteredThoughts, connections, focusedIds]);

  const getNodeRadius = (count: number) => {
    if (count >= 7) return 28;
    if (count >= 4) return 22;
    if (count >= 2) return 17;
    return 13;
  };

  // Pulse animation for recent connections
  useEffect(() => {
    const tick = () => {
      pulseRef.current = (pulseRef.current + 0.03) % (Math.PI * 2);
      draw();
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const { x: tx, y: ty, scale } = transformRef.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.translate(tx, ty);
    ctx.scale(scale, scale);

    const nodes = nodesRef.current;
    const links = linksRef.current;
    const hovered = hoveredNode;
    const now = Date.now();
    const pulseAlpha = (Math.sin(pulseRef.current) + 1) / 2; // 0..1

    // Draw edges (sorted weak→strong so strong ones render on top)
    const sortedLinks = [...links].sort((a, b) => a.strength - b.strength);
    sortedLinks.forEach(link => {
      const s = link.source as GraphNode;
      const t = link.target as GraphNode;
      if (s.x == null || t.x == null) return;

      const isHighlighted = hovered && (s.id === hovered.id || t.id === hovered.id);
      const isRecent = now - new Date(link.created_at).getTime() < RECENT_MS;
      const isWeak = link.strength < 0.4;

      const connColor = CONN_TYPE_LABELS[link.connection_type]?.color || "#c4a46a";
      const baseAlpha = isWeak ? 0.08 : 0.12 + link.strength * 0.35;
      const alpha = isHighlighted ? Math.min(0.85, baseAlpha + 0.4) : baseAlpha;
      const width = 0.6 + link.strength * 3.2;

      ctx.beginPath();
      ctx.moveTo(s.x, s.y!);
      ctx.lineTo(t.x, t.y!);
      ctx.strokeStyle = `${connColor}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`;
      ctx.lineWidth = isHighlighted ? width + 1 : width;

      if (isRecent) {
        ctx.shadowColor = connColor;
        ctx.shadowBlur = 6 + pulseAlpha * 8;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    });

    // Draw nodes
    const isNeon = theme === "neon";
    const NEON = "#00FF94";
    nodes.forEach(node => {
      if (node.x == null || node.y == null) return;
      const r = getNodeRadius(node.connectionCount);
      const baseColor = TYPE_COLORS[node.type] || "#c4a46a";
      const color = isNeon ? NEON : baseColor;
      const isHovered = hovered?.id === node.id;
      const isFocused = focusNodeId === node.id;
      const isFiltered = filterType && node.type !== filterType && !focusedIds;
      const isRecent = now - new Date(node.created_at).getTime() < RECENT_MS;

      // Recent glow ring (stronger in neon)
      if (isRecent && !isFiltered) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + (isNeon ? 6 : 4) + pulseAlpha * (isNeon ? 4 : 2), 0, Math.PI * 2);
        const alphaHex = Math.round(pulseAlpha * (isNeon ? 180 : 100)).toString(16).padStart(2, "0");
        ctx.strokeStyle = `${color}${alphaHex}`;
        ctx.lineWidth = isNeon ? 2 : 1.5;
        if (isNeon) {
          ctx.shadowColor = NEON;
          ctx.shadowBlur = 8 + pulseAlpha * 8;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Focused node ring
      if (isFocused) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 6, 0, Math.PI * 2);
        ctx.strokeStyle = isNeon ? NEON : "#fef3c7";
        ctx.lineWidth = 2;
        if (isNeon) {
          ctx.shadowColor = NEON;
          ctx.shadowBlur = 14;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, isHovered ? r * 1.18 : r, 0, Math.PI * 2);
      if (isNeon) {
        ctx.fillStyle = `rgba(0,255,148,${isHovered || isFocused ? 0.22 : 0.10})`;
        ctx.globalAlpha = isFiltered ? 0.25 : 1;
        ctx.fill();
        ctx.strokeStyle = NEON;
        ctx.lineWidth = isHovered || isFocused ? 2 : 1.4;
        ctx.stroke();
      } else {
        ctx.fillStyle = color;
        ctx.globalAlpha = isFiltered ? 0.18 : isHovered || isFocused ? 1 : 0.82;
        ctx.fill();

        // Inner highlight (gold theme only)
        ctx.beginPath();
        ctx.arc(node.x - r * 0.3, node.y - r * 0.3, r * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.fill();

        if (isHovered || isFocused) {
          ctx.shadowColor = color;
          ctx.shadowBlur = 22;
          ctx.beginPath();
          ctx.arc(node.x, node.y, r * 1.05, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
      ctx.globalAlpha = 1;

      // Label on hover or focus
      if (isHovered || isFocused) {
        const label = node.content.substring(0, 50) + (node.content.length > 50 ? "…" : "");
        ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
        ctx.textAlign = "center";

        const metrics = ctx.measureText(label);
        const pad = 6;
        const bgW = metrics.width + pad * 2;
        const bgH = 18;
        ctx.fillStyle = isNeon ? "rgba(17,22,29,0.92)" : "rgba(15, 13, 10, 0.85)";
        ctx.fillRect(node.x - bgW / 2, node.y + r + 8, bgW, bgH);
        if (isNeon) {
          ctx.strokeStyle = `${NEON}55`;
          ctx.lineWidth = 1;
          ctx.strokeRect(node.x - bgW / 2, node.y + r + 8, bgW, bgH);
        }
        ctx.fillStyle = isNeon ? "#E6EDF3" : "#ede4d3";
        ctx.fillText(label, node.x, node.y + r + 21);
      }
    });

    ctx.restore();
  }, [hoveredNode, filterType, focusNodeId, focusedIds, theme]);

  // Resize canvas
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = container.clientWidth * dpr;
      canvas.height = container.clientHeight * dpr;
      canvas.style.width = container.clientWidth + "px";
      canvas.style.height = container.clientHeight + "px";
      draw();
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [draw]);

  const findNodeAt = (cx: number, cy: number): GraphNode | null => {
    const { x: tx, y: ty, scale } = transformRef.current;
    const gx = (cx - tx) / scale;
    const gy = (cy - ty) / scale;
    for (const node of nodesRef.current) {
      if (node.x == null || node.y == null) continue;
      const r = getNodeRadius(node.connectionCount);
      const dx = gx - node.x;
      const dy = gy - node.y;
      if (dx * dx + dy * dy < r * r * 1.5) return node;
    }
    return null;
  };

  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const touch = "touches" in e ? e.touches[0] : e;
    return { x: (touch as any).clientX - rect.left, y: (touch as any).clientY - rect.top };
  };

  const handlePointerDown = (e: React.MouseEvent) => {
    const pos = getCanvasPos(e);
    const node = findNodeAt(pos.x, pos.y);
    dragRef.current = { dragging: true, startX: pos.x, startY: pos.y, node, moved: false };
  };

  const handlePointerMove = (e: React.MouseEvent) => {
    const pos = getCanvasPos(e);
    if (dragRef.current.dragging) {
      const dx = pos.x - dragRef.current.startX;
      const dy = pos.y - dragRef.current.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragRef.current.moved = true;
      if (!dragRef.current.node) {
        transformRef.current.x += dx;
        transformRef.current.y += dy;
        dragRef.current.startX = pos.x;
        dragRef.current.startY = pos.y;
        draw();
      }
    } else {
      const node = findNodeAt(pos.x, pos.y);
      setHoveredNode(node);
    }
  };

  const handlePointerUp = () => {
    const d = dragRef.current;
    if (d.dragging && d.node && !d.moved) {
      if (onSelectNode) {
        // Embedded mode: notify parent and visually focus that node
        onSelectNode(d.node.id);
        setFocusNodeId(d.node.id);
      } else {
        setSelectedNode(d.node);
      }
    }
    dragRef.current = { dragging: false, startX: 0, startY: 0, node: null, moved: false };
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.92 : 1.08;
    const newScale = Math.max(0.3, Math.min(3, transformRef.current.scale * delta));
    transformRef.current.scale = newScale;
    draw();
  };

  const enterFocusMode = (nodeId: string) => {
    setFocusNodeId(nodeId);
    setSelectedNode(null);
  };

  const exitFocusMode = () => {
    setFocusNodeId(null);
  };

  const isNeon = theme === "neon";
  return (
    <div className="w-full h-full flex flex-col relative" style={{ minHeight: 400, background: isNeon ? "transparent" : undefined }}>
      {!embedded && (<>
      {/* Top bar: filters OR focus mode header */}
      {focusNodeId ? (
        <div className="flex items-center gap-2 px-3 py-2 flex-shrink-0"
          style={{ background: "hsl(var(--card) / 0.6)", borderBottom: "1px solid hsl(var(--border))" }}>
          <button
            onClick={exitFocusMode}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-ui transition-colors hover:bg-muted/50"
            style={{ background: "hsl(var(--muted) / 0.3)", color: "hsl(var(--foreground))" }}
          >
            <ArrowLeft size={12} /> Voltar ao grafo
          </button>
          <div className="flex items-center gap-1.5 text-[11px] font-ui" style={{ color: "hsl(var(--muted-foreground))" }}>
            <Focus size={11} />
            <span>Modo Foco · {focusedConnections.length} conexão{focusedConnections.length !== 1 ? "ões" : ""}</span>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 px-3 py-2 flex-shrink-0 flex-wrap">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-ui"
              style={{ background: "hsl(var(--muted) / 0.3)", color: "hsl(var(--muted-foreground))" }}
            >
              <Filter size={12} /> Filtros
            </button>
            {PERIODS.map(p => (
              <button
                key={p.key}
                onClick={() => setFilterPeriod(p.key)}
                className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider font-ui transition-all"
                style={{
                  background: filterPeriod === p.key ? "hsl(var(--primary) / 0.15)" : "transparent",
                  color: filterPeriod === p.key ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                  border: filterPeriod === p.key ? "1px solid hsl(var(--primary) / 0.3)" : "1px solid transparent",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {showFilters && (
            <div className="flex flex-wrap gap-1 px-3 pb-2">
              <button
                onClick={() => setFilterType(null)}
                className="px-2 py-0.5 rounded-full text-[10px] font-bold font-ui"
                style={{
                  background: !filterType ? "hsl(var(--primary) / 0.15)" : "transparent",
                  color: !filterType ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                  border: !filterType ? "1px solid hsl(var(--primary) / 0.3)" : "1px solid hsl(var(--border))",
                }}
              >
                Todos
              </button>
              {Object.entries(TYPE_LABELS).map(([key, { emoji, label }]) => (
                <button
                  key={key}
                  onClick={() => setFilterType(filterType === key ? null : key)}
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold font-ui"
                  style={{
                    background: filterType === key ? `${TYPE_COLORS[key]}22` : "transparent",
                    color: filterType === key ? TYPE_COLORS[key] : "hsl(var(--muted-foreground))",
                    border: filterType === key ? `1px solid ${TYPE_COLORS[key]}44` : "1px solid hsl(var(--border))",
                  }}
                >
                  {emoji} {label}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      </>)}

      {/* Canvas + side panel layout */}
      <div className="flex-1 flex overflow-hidden">
        <div ref={containerRef} className="flex-1 relative overflow-hidden" style={{ background: isNeon ? "transparent" : "hsl(var(--background))" }}>
          <canvas
            ref={canvasRef}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={() => { setHoveredNode(null); dragRef.current.dragging = false; }}
            onWheel={handleWheel}
            className="cursor-grab active:cursor-grabbing"
          />
          {filteredThoughts.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-muted-foreground/50 text-sm italic font-body">
                {focusNodeId ? "Nenhum vizinho encontrado" : "Registre pensamentos para visualizar o grafo"}
              </p>
            </div>
          )}

          {/* Legend */}
          {!focusNodeId && (
            <div className="absolute bottom-3 left-3 p-2 rounded-lg text-[9px] space-y-0.5 hidden md:block"
              style={{ background: "hsl(var(--card) / 0.9)", border: "1px solid hsl(var(--border))" }}>
              {Object.entries(TYPE_LABELS).map(([key, { emoji, label }]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: TYPE_COLORS[key] }} />
                  <span style={{ color: "hsl(var(--muted-foreground))" }}>{label}</span>
                </div>
              ))}
              <div className="pt-1 text-muted-foreground/40 space-y-0.5" style={{ borderTop: "1px solid hsl(var(--border))" }}>
                <div>● maior = mais conexões</div>
                <div>━ mais grossa = conexão forte</div>
                <div>✨ pulsando = recente (7 dias)</div>
              </div>
            </div>
          )}
        </div>

        {/* Focus side panel (desktop) */}
        {focusNodeId && focusedThought && (
          <div className="hidden md:flex w-[340px] flex-col border-l overflow-hidden"
            style={{ background: "hsl(var(--card) / 0.4)", borderColor: "hsl(var(--border))" }}>
            <div className="p-4 border-b" style={{ borderColor: "hsl(var(--border))" }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ background: TYPE_COLORS[focusedThought.type] }} />
                <span className="text-xs font-bold font-ui" style={{ color: TYPE_COLORS[focusedThought.type] }}>
                  {TYPE_LABELS[focusedThought.type]?.emoji} {TYPE_LABELS[focusedThought.type]?.label}
                </span>
              </div>
              <p className="text-sm text-foreground/90 font-body leading-relaxed">{focusedThought.content}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <div className="flex items-center gap-1.5 px-1 mb-1">
                <Sparkles size={11} style={{ color: "hsl(var(--primary))" }} />
                <span className="text-[10px] font-bold uppercase tracking-wider font-ui" style={{ color: "hsl(var(--muted-foreground))" }}>
                  Conexões detectadas
                </span>
              </div>
              {focusedConnections.length === 0 ? (
                <p className="text-xs italic text-muted-foreground/60 px-2 py-4 text-center">
                  Nenhuma conexão ainda. Registre pensamentos relacionados para a IA detectar padrões.
                </p>
              ) : (
                focusedConnections.map((c, i) => {
                  const ct = CONN_TYPE_LABELS[c.connection_type] || CONN_TYPE_LABELS.semantic;
                  const strength = Math.round((c.strength ?? 0.5) * 100);
                  return (
                    <button
                      key={i}
                      onClick={() => c.other && enterFocusMode(c.other.id)}
                      className="w-full text-left p-2.5 rounded-lg transition-all hover:scale-[1.01]"
                      style={{
                        background: "hsl(var(--background) / 0.6)",
                        border: `1px solid ${ct.color}33`,
                      }}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold font-ui" style={{ color: ct.color }}>
                          {ct.emoji} {ct.label}
                        </span>
                        <span className="text-[10px] font-mono" style={{ color: "hsl(var(--muted-foreground))" }}>
                          {strength}%
                        </span>
                      </div>
                      <div className="h-0.5 rounded-full mb-2 overflow-hidden" style={{ background: "hsl(var(--muted) / 0.3)" }}>
                        <div className="h-full rounded-full" style={{ width: `${strength}%`, background: ct.color }} />
                      </div>
                      {c.explanation && (
                        <p className="text-[11px] leading-snug text-foreground/70 font-body italic mb-1.5">
                          "{c.explanation}"
                        </p>
                      )}
                      {c.other && (
                        <div className="flex items-start gap-1.5 pt-1.5 border-t" style={{ borderColor: "hsl(var(--border) / 0.5)" }}>
                          <div className="w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0" style={{ background: TYPE_COLORS[c.other.type] }} />
                          <p className="text-[10px] text-muted-foreground line-clamp-2 font-body">
                            {c.other.content}
                          </p>
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Selected node bottom sheet (with Focus button) */}
      {selectedNode && !focusNodeId && !embedded && (
        <div
          className="absolute bottom-0 left-0 right-0 rounded-t-2xl p-4 animate-fade-in z-50"
          style={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderBottom: "none",
            maxHeight: "55%",
            boxShadow: "0 -8px 24px rgba(0,0,0,0.3)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: TYPE_COLORS[selectedNode.type] }} />
              <span className="text-xs font-bold font-ui" style={{ color: TYPE_COLORS[selectedNode.type] }}>
                {TYPE_LABELS[selectedNode.type]?.emoji} {TYPE_LABELS[selectedNode.type]?.label}
              </span>
              <span className="text-[10px] font-ui" style={{ color: "hsl(var(--muted-foreground))" }}>
                · {selectedNode.connectionCount} conex.
              </span>
            </div>
            <button onClick={() => setSelectedNode(null)} className="text-muted-foreground hover:text-foreground transition-colors">
              <X size={16} />
            </button>
          </div>
          <p className="text-sm text-foreground/85 font-body leading-relaxed overflow-auto mb-3" style={{ maxHeight: 160 }}>
            {selectedNode.content}
          </p>
          <button
            onClick={() => enterFocusMode(selectedNode.id)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold font-ui transition-all hover:scale-[1.01]"
            style={{
              background: "hsl(var(--primary) / 0.15)",
              color: "hsl(var(--primary))",
              border: "1px solid hsl(var(--primary) / 0.3)",
            }}
          >
            <Focus size={13} /> Entrar em Modo Foco
          </button>
        </div>
      )}

      {/* Focus mode mobile bottom sheet */}
      {focusNodeId && focusedThought && !embedded && (
        <div className="md:hidden absolute bottom-0 left-0 right-0 rounded-t-2xl z-40 max-h-[55%] flex flex-col"
          style={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderBottom: "none",
            boxShadow: "0 -8px 24px rgba(0,0,0,0.3)",
          }}>
          <div className="p-3 border-b flex-shrink-0" style={{ borderColor: "hsl(var(--border))" }}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: TYPE_COLORS[focusedThought.type] }} />
              <span className="text-[11px] font-bold font-ui" style={{ color: TYPE_COLORS[focusedThought.type] }}>
                {TYPE_LABELS[focusedThought.type]?.emoji} {TYPE_LABELS[focusedThought.type]?.label}
              </span>
            </div>
            <p className="text-xs text-foreground/85 font-body leading-snug line-clamp-2">{focusedThought.content}</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {focusedConnections.length === 0 ? (
              <p className="text-[11px] italic text-muted-foreground/60 px-2 py-4 text-center">
                Nenhuma conexão detectada.
              </p>
            ) : focusedConnections.map((c, i) => {
              const ct = CONN_TYPE_LABELS[c.connection_type] || CONN_TYPE_LABELS.semantic;
              const strength = Math.round((c.strength ?? 0.5) * 100);
              return (
                <button
                  key={i}
                  onClick={() => c.other && enterFocusMode(c.other.id)}
                  className="w-full text-left p-2 rounded-lg"
                  style={{ background: "hsl(var(--background) / 0.5)", border: `1px solid ${ct.color}33` }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold font-ui" style={{ color: ct.color }}>{ct.emoji} {ct.label}</span>
                    <span className="text-[10px] font-mono" style={{ color: "hsl(var(--muted-foreground))" }}>{strength}%</span>
                  </div>
                  {c.explanation && (
                    <p className="text-[10.5px] leading-snug text-foreground/70 font-body italic">"{c.explanation}"</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
