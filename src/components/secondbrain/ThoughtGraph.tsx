import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, SimulationNodeDatum, SimulationLinkDatum } from "d3-force";
import { Filter, X } from "lucide-react";

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
}

const TYPE_COLORS: Record<string, string> = {
  problema: "#c97a7a",
  insight: "#c4a46a",
  estudo: "#7ba3c9",
  reflexão: "#b08db5",
  oração: "#d4b87a",
  decisão: "#d4854a",
  emocional: "#e8a0b4",
  ideia: "#8b9e7a",
  pergunta: "#6a9c8a",
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

const PERIODS = [
  { key: "week", label: "Semana" },
  { key: "month", label: "Mês" },
  { key: "3months", label: "3 Meses" },
  { key: "all", label: "Tudo" },
];

export default function ThoughtGraph({ userCodeId }: { userCodeId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const nodesRef = useRef<GraphNode[]>([]);
  const linksRef = useRef<GraphLink[]>([]);
  const simRef = useRef<any>(null);
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });
  const dragRef = useRef<{ dragging: boolean; startX: number; startY: number; node: GraphNode | null }>({
    dragging: false, startX: 0, startY: 0, node: null,
  });
  const animRef = useRef<number>(0);

  useEffect(() => {
    loadData();
  }, [userCodeId]);

  const loadData = async () => {
    const [{ data: t }, { data: c }] = await Promise.all([
      supabase.from("thoughts").select("id, content, type, keywords, created_at")
        .eq("user_code_id", userCodeId).order("created_at", { ascending: false }).limit(200),
      supabase.from("thought_connections").select("thought_a, thought_b, strength")
        .eq("user_code_id", userCodeId).limit(500),
    ]);
    if (t) setThoughts(t.map(x => ({ ...x, keywords: (x.keywords as string[]) || [] })));
    if (c) setConnections(c);
  };

  const filteredThoughts = useMemo(() => {
    let result = thoughts;
    if (filterType) result = result.filter(t => t.type === filterType);
    if (filterPeriod !== "all") {
      const now = Date.now();
      const ms = filterPeriod === "week" ? 7 * 86400000 : filterPeriod === "month" ? 30 * 86400000 : 90 * 86400000;
      result = result.filter(t => now - new Date(t.created_at).getTime() < ms);
    }
    return result;
  }, [thoughts, filterType, filterPeriod]);

  // Build graph + simulation
  useEffect(() => {
    if (!containerRef.current || filteredThoughts.length === 0) return;

    const w = containerRef.current.clientWidth;
    const h = containerRef.current.clientHeight;

    const idSet = new Set(filteredThoughts.map(t => t.id));
    const connMap: Record<string, number> = {};
    const validLinks: GraphLink[] = [];

    connections.forEach(c => {
      if (idSet.has(c.thought_a) && idSet.has(c.thought_b)) {
        connMap[c.thought_a] = (connMap[c.thought_a] || 0) + 1;
        connMap[c.thought_b] = (connMap[c.thought_b] || 0) + 1;
        validLinks.push({ source: c.thought_a, target: c.thought_b, strength: c.strength ?? 0.5 });
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
      .force("link", forceLink<GraphNode, GraphLink>(validLinks).id(d => d.id).distance(100))
      .force("charge", forceManyBody().strength(-150))
      .force("center", forceCenter(w / 2, h / 2))
      .force("collide", forceCollide(30))
      .alphaDecay(0.02)
      .on("tick", () => draw());

    simRef.current = sim;

    // Center transform
    transformRef.current = { x: 0, y: 0, scale: 1 };

    return () => { sim.stop(); };
  }, [filteredThoughts, connections]);

  const getNodeRadius = (count: number) => {
    if (count >= 7) return 28;
    if (count >= 4) return 22;
    if (count >= 2) return 17;
    return 13;
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const { x: tx, y: ty, scale } = transformRef.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.translate(tx, ty);
    ctx.scale(scale, scale);

    const nodes = nodesRef.current;
    const links = linksRef.current;
    const hovered = hoveredNode;

    // Draw edges
    links.forEach(link => {
      const s = link.source as GraphNode;
      const t = link.target as GraphNode;
      if (!s.x || !t.x) return;
      const isHighlighted = hovered && (s.id === hovered.id || t.id === hovered.id);
      ctx.beginPath();
      ctx.moveTo(s.x, s.y!);
      ctx.lineTo(t.x, t.y!);
      ctx.strokeStyle = isHighlighted ? "rgba(196,164,106,0.5)" : "rgba(196,164,106,0.08)";
      ctx.lineWidth = isHighlighted ? 2 : 1;
      ctx.stroke();
    });

    // Draw nodes
    nodes.forEach(node => {
      if (!node.x || !node.y) return;
      const r = getNodeRadius(node.connectionCount);
      const color = TYPE_COLORS[node.type] || "#c4a46a";
      const isHovered = hovered?.id === node.id;
      const isFiltered = filterType && node.type !== filterType;

      ctx.beginPath();
      ctx.arc(node.x, node.y, isHovered ? r * 1.15 : r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = isFiltered ? 0.2 : isHovered ? 1 : 0.75;
      ctx.fill();
      if (isHovered) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 20;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;

      // Label on hover
      if (isHovered) {
        const label = node.content.substring(0, 40) + (node.content.length > 40 ? "…" : "");
        ctx.font = "11px sans-serif";
        ctx.fillStyle = "#ede4d3";
        ctx.textAlign = "center";
        ctx.fillText(label, node.x, node.y + r + 16);
      }
    });

    ctx.restore();
  }, [hoveredNode, filterType]);

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

  // Redraw on hover change
  useEffect(() => { draw(); }, [hoveredNode, draw]);

  const findNodeAt = (cx: number, cy: number): GraphNode | null => {
    const { x: tx, y: ty, scale } = transformRef.current;
    const gx = (cx - tx) / scale;
    const gy = (cy - ty) / scale;
    for (const node of nodesRef.current) {
      if (!node.x || !node.y) continue;
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
    dragRef.current = { dragging: true, startX: pos.x, startY: pos.y, node };
  };

  const handlePointerMove = (e: React.MouseEvent) => {
    const pos = getCanvasPos(e);
    if (dragRef.current.dragging && !dragRef.current.node) {
      const dx = pos.x - dragRef.current.startX;
      const dy = pos.y - dragRef.current.startY;
      transformRef.current.x += dx;
      transformRef.current.y += dy;
      dragRef.current.startX = pos.x;
      dragRef.current.startY = pos.y;
      draw();
    } else {
      const node = findNodeAt(pos.x, pos.y);
      setHoveredNode(node);
    }
  };

  const handlePointerUp = (e: React.MouseEvent) => {
    const pos = getCanvasPos(e);
    const d = dragRef.current;
    if (d.dragging && d.node && Math.abs(pos.x - d.startX) < 5 && Math.abs(pos.y - d.startY) < 5) {
      setSelectedNode(d.node);
    }
    dragRef.current = { dragging: false, startX: 0, startY: 0, node: null };
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.92 : 1.08;
    const newScale = Math.max(0.3, Math.min(3, transformRef.current.scale * delta));
    transformRef.current.scale = newScale;
    draw();
  };

  return (
    <div className="w-full h-full flex flex-col" style={{ minHeight: 400 }}>
      {/* Filters */}
      <div className="flex items-center gap-2 px-3 py-2 flex-shrink-0">
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

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden rounded-xl" style={{ background: "hsl(var(--background))" }}>
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
            <p className="text-muted-foreground/50 text-sm italic font-body">Registre pensamentos para visualizar o grafo</p>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-3 left-3 p-2 rounded-lg text-[9px] space-y-0.5"
          style={{ background: "hsl(var(--card) / 0.9)", border: "1px solid hsl(var(--border))" }}>
          {Object.entries(TYPE_LABELS).map(([key, { emoji, label }]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: TYPE_COLORS[key] }} />
              <span style={{ color: "hsl(var(--muted-foreground))" }}>{label}</span>
            </div>
          ))}
          <div className="pt-1 text-muted-foreground/40" style={{ borderTop: "1px solid hsl(var(--border))" }}>
            ● maior = mais conexões
          </div>
        </div>
      </div>

      {/* Selected node bottom sheet */}
      {selectedNode && (
        <div
          className="absolute bottom-0 left-0 right-0 rounded-t-2xl p-4 animate-fade-in z-50"
          style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderBottom: "none", maxHeight: "50%" }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: TYPE_COLORS[selectedNode.type] }} />
              <span className="text-xs font-bold font-ui" style={{ color: TYPE_COLORS[selectedNode.type] }}>
                {TYPE_LABELS[selectedNode.type]?.emoji} {TYPE_LABELS[selectedNode.type]?.label}
              </span>
            </div>
            <button onClick={() => setSelectedNode(null)} className="text-muted-foreground">
              <X size={16} />
            </button>
          </div>
          <p className="text-sm text-foreground/80 font-body leading-relaxed overflow-auto" style={{ maxHeight: 200 }}>
            {selectedNode.content}
          </p>
        </div>
      )}
    </div>
  );
}
