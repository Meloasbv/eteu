import { useCallback, useState, useRef, useEffect } from "react";
import {
  ReactFlow,
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  type OnConnect,
  BackgroundVariant,
  Panel,
  Handle,
  Position,
  useReactFlow,
  ReactFlowProvider,
  type NodeProps,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Plus, StickyNote, Link2, Palette, X, Undo2, Redo2,
  Maximize, Trash2, Copy, PlusCircle, Pencil, ChevronDown, ChevronUp,
  ArrowUpDown, ArrowLeftRight, Type, Heading1, Heading2, AlignLeft,
  Save, Loader2,
} from "lucide-react";
import dagre from "dagre";
import { supabase } from "@/integrations/supabase/client";
import MindMapCardEditor from "./MindMapCardEditor";

// ── Colors ──

const manualColors = [
  { name: "Ouro", value: "#c4a46a" },
  { name: "Azul", value: "#7ba3c9" },
  { name: "Fogo", value: "#d4854a" },
  { name: "Verde", value: "#8b9e7a" },
  { name: "Roxo", value: "#b08db5" },
  { name: "Vermelho", value: "#c97a7a" },
  { name: "Ciano", value: "#6a9c8a" },
  { name: "Neutro", value: "#8a7d6a" },
];

const handleStyle = {
  width: 12, height: 12,
  background: "rgba(196,164,106,0.5)",
  border: "2px solid rgba(196,164,106,0.7)",
  borderRadius: "50%",
  opacity: 0,
  transition: "all 0.15s ease",
};

// ── Custom Nodes ──

function ManualRootNode({ data, id }: NodeProps) {
  const d = data as Record<string, any>;
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(d.label as string);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setValue(d.label as string); }, [d.label]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = () => {
    setEditing(false);
    d.onLabelChange?.(id, value || "Tema Central");
  };

  return (
    <div
      className="px-8 py-6 rounded-[24px] text-center min-w-[220px] relative group"
      style={{
        background: "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--background-secondary)) 100%)",
        border: "2px solid hsl(var(--primary))",
        boxShadow: "0 0 40px hsl(var(--primary) / 0.12)",
      }}
      onDoubleClick={() => setEditing(true)}
    >
      <Handle type="source" position={Position.Top} className="group-hover:!opacity-100" style={handleStyle} />
      <Handle type="source" position={Position.Bottom} className="group-hover:!opacity-100" style={handleStyle} />
      <Handle type="source" position={Position.Left} className="group-hover:!opacity-100" style={handleStyle} />
      <Handle type="source" position={Position.Right} className="group-hover:!opacity-100" style={handleStyle} />
      <Handle type="target" position={Position.Top} className="group-hover:!opacity-100" style={{ ...handleStyle, top: -4 }} />
      <Handle type="target" position={Position.Bottom} className="group-hover:!opacity-100" style={{ ...handleStyle, bottom: -4 }} />
      <Handle type="target" position={Position.Left} className="group-hover:!opacity-100" style={{ ...handleStyle, left: -4 }} />
      <Handle type="target" position={Position.Right} className="group-hover:!opacity-100" style={{ ...handleStyle, right: -4 }} />
      {editing ? (
        <input
          ref={inputRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setValue(d.label as string); setEditing(false); } }}
          className="bg-transparent text-center text-xl font-bold font-display text-foreground w-full outline-none border-b border-primary/30"
        />
      ) : (
        <p className="font-display text-xl font-bold text-foreground tracking-wide">{d.label as string}</p>
      )}
    </div>
  );
}

type NodeLevel = "title" | "subtitle" | "text";

const levelStyles: Record<NodeLevel, { fontSize: string; fontWeight: string; opacity: string; padding: string; minW: string; maxW: string }> = {
  title: { fontSize: "text-[17px]", fontWeight: "font-bold", opacity: "1", padding: "18px 22px", minW: "200px", maxW: "300px" },
  subtitle: { fontSize: "text-[14px]", fontWeight: "font-semibold", opacity: "0.9", padding: "14px 18px", minW: "170px", maxW: "260px" },
  text: { fontSize: "text-[12px]", fontWeight: "font-normal", opacity: "0.75", padding: "10px 14px", minW: "140px", maxW: "220px" },
};

const levelLabels: Record<NodeLevel, string> = { title: "Título", subtitle: "Subtítulo", text: "Texto" };

function SimpleNode({ data, id }: NodeProps) {
  const d = data as Record<string, any>;
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(d.title as string);
  const [desc, setDesc] = useState((d.description as string) || "");
  const inputRef = useRef<HTMLInputElement>(null);
  const color = (d.color as string) || "#c4a46a";
  const colorMode = (d.colorMode as string) || "border";
  const level: NodeLevel = (d.level as NodeLevel) || "subtitle";
  const ls = levelStyles[level];

  useEffect(() => { setTitle(d.title as string); setDesc((d.description as string) || ""); }, [d.title, d.description]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = () => {
    setEditing(false);
    d.onDataChange?.(id, { title: title || "Novo card", description: desc });
  };

  const borderWidth = level === "title" ? 4 : level === "subtitle" ? 3 : 2;
  const shadow = level === "title" ? "0 4px 16px rgba(0,0,0,0.4)" : level === "subtitle" ? "0 2px 8px rgba(0,0,0,0.3)" : "0 1px 4px rgba(0,0,0,0.2)";

  return (
    <div
      className="rounded-[14px] relative group cursor-grab active:cursor-grabbing transition-all"
      style={{
        background: colorMode === "fill" ? `${color}0F` : "hsl(var(--card))",
        border: `1px solid ${colorMode === "fill" ? `${color}40` : "hsl(var(--border))"}`,
        borderLeft: `${borderWidth}px solid ${color}`,
        padding: ls.padding,
        minWidth: ls.minW,
        maxWidth: ls.maxW,
        boxShadow: shadow,
      }}
      onDoubleClick={() => setEditing(true)}
    >
      <Handle type="source" position={Position.Top} className="group-hover:!opacity-100" style={handleStyle} />
      <Handle type="source" position={Position.Bottom} className="group-hover:!opacity-100" style={handleStyle} />
      <Handle type="source" position={Position.Left} className="group-hover:!opacity-100" style={handleStyle} />
      <Handle type="source" position={Position.Right} className="group-hover:!opacity-100" style={handleStyle} />
      <Handle type="target" position={Position.Top} className="group-hover:!opacity-100" style={{ ...handleStyle, top: -4 }} />
      <Handle type="target" position={Position.Bottom} className="group-hover:!opacity-100" style={{ ...handleStyle, bottom: -4 }} />
      <Handle type="target" position={Position.Left} className="group-hover:!opacity-100" style={{ ...handleStyle, left: -4 }} />
      <Handle type="target" position={Position.Right} className="group-hover:!opacity-100" style={{ ...handleStyle, right: -4 }} />
      <span className="absolute -top-2 right-2 px-1.5 py-0.5 rounded text-[8px] font-ui uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: `${color}20`, color, border: `1px solid ${color}30` }}>
        {levelLabels[level]}
      </span>
      {editing ? (
        <div className="space-y-1">
          <input ref={inputRef} value={title} onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setTitle(d.title as string); setEditing(false); } }}
            className={`bg-transparent ${ls.fontSize} font-display ${ls.fontWeight} text-foreground w-full outline-none border-b border-primary/20 pb-1`}
            placeholder="Título" />
          <input value={desc} onChange={e => setDesc(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === "Enter") commit(); }}
            className="bg-transparent text-[11px] font-ui text-muted-foreground w-full outline-none"
            placeholder="Descrição (opcional)" />
        </div>
      ) : (
        <>
          <p className={`font-display ${ls.fontSize} ${ls.fontWeight} text-foreground`} style={{ opacity: ls.opacity }}>{d.title as string}</p>
          {d.description && (
            <p className="font-ui text-[11px] text-muted-foreground mt-1 leading-relaxed">{d.description as string}</p>
          )}
        </>
      )}
    </div>
  );
}

function NoteCardNode({ data, id }: NodeProps) {
  const d = data as Record<string, any>;
  const [expanded, setExpanded] = useState((d.isExpanded as boolean) ?? true);
  const color = (d.color as string) || "#c4a46a";
  const colorMode = (d.colorMode as string) || "border";
  const contentHtml = (d.content as string) || "";

  // Strip HTML for preview
  const plainPreview = contentHtml.replace(/<[^>]+>/g, "").slice(0, 120);

  return (
    <div
      className="rounded-[14px] relative group transition-all"
      style={{
        width: expanded ? 320 : 260,
        background: colorMode === "fill" ? `${color}0F` : "hsl(var(--card))",
        border: `1px solid ${expanded ? `${color}40` : "hsl(var(--border))"}`,
        borderLeft: `3px solid ${color}`,
        boxShadow: expanded ? "0 8px 32px rgba(0,0,0,0.5)" : "0 2px 12px rgba(0,0,0,0.3)",
        overflow: "hidden",
      }}
      onDoubleClick={() => d.onEditCard?.(id)}
    >
      <Handle type="source" position={Position.Top} className="group-hover:!opacity-100" style={handleStyle} />
      <Handle type="source" position={Position.Bottom} className="group-hover:!opacity-100" style={handleStyle} />
      <Handle type="source" position={Position.Left} className="group-hover:!opacity-100" style={handleStyle} />
      <Handle type="source" position={Position.Right} className="group-hover:!opacity-100" style={handleStyle} />
      <Handle type="target" position={Position.Top} className="group-hover:!opacity-100" style={{ ...handleStyle, top: -4 }} />
      <Handle type="target" position={Position.Bottom} className="group-hover:!opacity-100" style={{ ...handleStyle, bottom: -4 }} />
      <Handle type="target" position={Position.Left} className="group-hover:!opacity-100" style={{ ...handleStyle, left: -4 }} />
      <Handle type="target" position={Position.Right} className="group-hover:!opacity-100" style={{ ...handleStyle, right: -4 }} />
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <StickyNote size={14} style={{ color, flexShrink: 0 }} />
          <p className="font-display text-[15px] font-semibold text-foreground truncate">{d.title as string}</p>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <button onClick={() => d.onEditCard?.(id)} className="text-muted-foreground/50 hover:text-primary transition-colors flex-shrink-0" title="Editar">
            <Pencil size={13} />
          </button>
          <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground/50 hover:text-primary transition-colors flex-shrink-0">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>
      {expanded ? (
        <div className="px-4 pb-4">
          {contentHtml ? (
            <div className="text-[13px] font-body leading-relaxed prose prose-sm prose-invert max-w-none"
              style={{ color: "hsl(var(--foreground) / 0.75)" }}
              dangerouslySetInnerHTML={{ __html: contentHtml }} />
          ) : (
            <p className="text-[13px] font-body italic text-muted-foreground/40">Duplo clique para escrever...</p>
          )}
        </div>
      ) : (
        <div className="px-4 pb-3">
          <p className="text-[12px] font-body text-muted-foreground line-clamp-2">
            {plainPreview || "Sem conteúdo"}
          </p>
        </div>
      )}
    </div>
  );
}

const nodeTypes = {
  manualRoot: ManualRootNode,
  simpleNode: SimpleNode,
  noteCard: NoteCardNode,
};

const edgeStyle = { stroke: "rgba(196,164,106,0.35)", strokeWidth: 2 };
const edgeMarker = { type: MarkerType.ArrowClosed, width: 14, height: 14, color: "rgba(196,164,106,0.5)" };

const defaultEdgeOptions = {
  type: "smoothstep" as const,
  style: edgeStyle,
  markerEnd: edgeMarker,
  animated: false,
};

// ── Undo/Redo ──

interface HistoryState { nodes: Node[]; edges: Edge[]; }

function useUndoRedo(maxHistory = 50) {
  const [past, setPast] = useState<HistoryState[]>([]);
  const [future, setFuture] = useState<HistoryState[]>([]);

  const pushState = useCallback((state: HistoryState) => {
    setPast(prev => [...prev.slice(-maxHistory), state]);
    setFuture([]);
  }, [maxHistory]);

  const undo = useCallback((current: HistoryState): HistoryState | null => {
    if (past.length === 0) return null;
    const prev = past[past.length - 1];
    setPast(p => p.slice(0, -1));
    setFuture(f => [current, ...f]);
    return prev;
  }, [past]);

  const redo = useCallback((current: HistoryState): HistoryState | null => {
    if (future.length === 0) return null;
    const next = future[0];
    setFuture(f => f.slice(1));
    setPast(p => [...p, current]);
    return next;
  }, [future]);

  return { pushState, undo, redo, canUndo: past.length > 0, canRedo: future.length > 0 };
}

// ── Layout helper ──

function autoLayout(nodes: Node[], edges: Edge[], direction = "TB") {
  if (nodes.length === 0) return { nodes, edges };
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 60, ranksep: 80, marginx: 40, marginy: 40 });
  nodes.forEach(n => {
    const w = n.type === "noteCard" ? 320 : n.type === "manualRoot" ? 240 : 200;
    const h = n.type === "noteCard" ? 180 : n.type === "manualRoot" ? 80 : 60;
    g.setNode(n.id, { width: w, height: h });
  });
  edges.forEach(e => g.setEdge(e.source, e.target));
  dagre.layout(g);
  return {
    nodes: nodes.map(n => {
      const pos = g.node(n.id);
      if (!pos) return n;
      const w = n.type === "noteCard" ? 320 : n.type === "manualRoot" ? 240 : 200;
      const h = n.type === "noteCard" ? 180 : n.type === "manualRoot" ? 80 : 60;
      return { ...n, position: { x: pos.x - w / 2, y: pos.y - h / 2 } };
    }),
    edges,
  };
}

// ── Serialization helpers ──

function stripCallbacks(nodes: Node[]): any[] {
  return nodes.map(n => {
    const { onLabelChange, onDataChange, ...cleanData } = n.data as any;
    return { ...n, data: cleanData };
  });
}

// ── Main ──

let idCounter = 1;
const nextId = () => `manual-${idCounter++}`;

interface ManualCanvasProps {
  userCodeId: string;
  mapId: string | null;
  onClose: () => void;
}

function ManualCanvas({ userCodeId, mapId, onClose }: ManualCanvasProps) {
  const { fitView, screenToFlowPosition } = useReactFlow();

  const rootId = useRef(nextId());
  const makeRootNode = useCallback((): Node[] => [{
    id: rootId.current,
    type: "manualRoot",
    position: { x: 0, y: 0 },
    data: {
      label: "Clique para nomear",
      onLabelChange: (_id: string, label: string) => {
        setNodes(prev => prev.map(nd => nd.id === _id ? { ...nd, data: { ...nd.data, label } } : nd));
        dirtyRef.current = true;
      },
    },
  }], []);

  const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorMode, setColorMode] = useState<"border" | "fill">("border");
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const [mapTitle, setMapTitle] = useState("Meu Mapa Mental");
  const [editingTitle, setEditingTitle] = useState(false);
  const [edgeType, setEdgeType] = useState<"smoothstep" | "straight" | "default">("smoothstep");
  const [direction, setDirection] = useState<"TB" | "LR">("TB");
  const [currentMapId, setCurrentMapId] = useState<string | null>(mapId);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [loaded, setLoaded] = useState(!mapId);
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const dirtyRef = useRef(false);

  const history = useUndoRedo();

  // Helper to inject callbacks into node data
  const injectCallbacks = useCallback((ns: Node[]): Node[] => {
    return ns.map(n => ({
      ...n,
      data: {
        ...n.data,
        onLabelChange: (_id: string, label: string) => {
          setNodes(prev => prev.map(nd => nd.id === _id ? { ...nd, data: { ...nd.data, label } } : nd));
          dirtyRef.current = true;
        },
        onDataChange: (_id: string, updates: Record<string, any>) => {
          setNodes(prev => prev.map(nd => nd.id === _id ? { ...nd, data: { ...nd.data, ...updates } } : nd));
          dirtyRef.current = true;
        },
      },
    }));
  }, [setNodes]);

  // Initialize nodes for new maps
  useEffect(() => {
    if (mapId) return; // will be loaded below
    setNodes(makeRootNode());
    setLoaded(true);
  }, []);

  // Load existing map
  useEffect(() => {
    if (!mapId) return;
    (async () => {
      const { data } = await supabase
        .from("mind_maps")
        .select("*")
        .eq("id", mapId)
        .single();
      if (data) {
        setMapTitle(data.title);
        const loadedNodes = injectCallbacks((data.nodes as any) || []);
        setNodes(loadedNodes);
        setEdges((data.edges as any) || []);
        const maxId = loadedNodes.reduce((max, n) => {
          const match = n.id.match(/manual-(\d+)/);
          return match ? Math.max(max, parseInt(match[1])) : max;
        }, 0);
        idCounter = maxId + 1;
        setTimeout(() => fitView({ padding: 0.2 }), 100);
      }
      setLoaded(true);
    })();
  }, [mapId]);

  // Save function
  const saveMap = useCallback(async () => {
    setSaving(true);
    const cleanNodes = stripCallbacks(nodes);
    if (currentMapId) {
      await supabase
        .from("mind_maps")
        .update({ title: mapTitle, nodes: cleanNodes, edges, updated_at: new Date().toISOString() })
        .eq("id", currentMapId);
    } else {
      const { data } = await supabase
        .from("mind_maps")
        .insert({ user_code_id: userCodeId, title: mapTitle, nodes: cleanNodes, edges })
        .select("id")
        .single();
      if (data) setCurrentMapId(data.id);
    }
    dirtyRef.current = false;
    setLastSaved(new Date());
    setSaving(false);
  }, [nodes, edges, mapTitle, currentMapId, userCodeId]);

  // Auto-save every 5 seconds when dirty
  useEffect(() => {
    if (!loaded) return;
    const interval = setInterval(() => {
      if (dirtyRef.current) saveMap();
    }, 5000);
    return () => clearInterval(interval);
  }, [saveMap, loaded]);

  // Mark dirty on node/edge changes
  useEffect(() => {
    if (loaded) dirtyRef.current = true;
  }, [nodes, edges, mapTitle]);

  // Save on close
  const handleClose = useCallback(async () => {
    if (dirtyRef.current) await saveMap();
    onClose();
  }, [saveMap, onClose]);

  // Save history on meaningful changes
  const saveHistory = useCallback(() => {
    history.pushState({ nodes, edges });
  }, [nodes, edges, history]);

  const onConnect: OnConnect = useCallback((connection: Connection) => {
    saveHistory();
    setEdges(eds => addEdge({ ...connection, type: edgeType, style: edgeStyle, markerEnd: edgeMarker }, eds));
  }, [setEdges, saveHistory, edgeType]);

  // Update all edges when edge type changes
  const changeEdgeType = useCallback((newType: "smoothstep" | "straight" | "default") => {
    setEdgeType(newType);
    setEdges(eds => eds.map(e => ({ ...e, type: newType })));
  }, [setEdges]);

  // Add node
  const addNode = useCallback((type: "simpleNode" | "noteCard") => {
    saveHistory();
    const id = nextId();
    const viewport = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    const newNode: Node = {
      id,
      type,
      position: { x: viewport.x + (Math.random() - 0.5) * 100, y: viewport.y + (Math.random() - 0.5) * 100 },
      data: {
        title: type === "noteCard" ? "Nova Nota" : "Novo Card",
        description: "",
        content: "",
        color: "#c4a46a",
        colorMode: "border",
        level: "subtitle" as NodeLevel,
        isExpanded: true,
        onLabelChange: (_id: string, label: string) => {
          setNodes(prev => prev.map(nd => nd.id === _id ? { ...nd, data: { ...nd.data, label } } : nd));
          dirtyRef.current = true;
        },
        onDataChange: (_id: string, updates: Record<string, any>) => {
          setNodes(prev => prev.map(nd => nd.id === _id ? { ...nd, data: { ...nd.data, ...updates } } : nd));
          dirtyRef.current = true;
        },
      },
    };

    const newEdges: Edge[] = [];
    if (selectedNode) {
      newEdges.push({
        id: `edge-${selectedNode}-${id}`,
        source: selectedNode,
        target: id,
        type: edgeType,
        style: edgeStyle,
        markerEnd: edgeMarker,
      });
    }

    setNodes(ns => [...ns, newNode]);
    setEdges(es => [...es, ...newEdges]);
    setSelectedNode(id);
  }, [screenToFlowPosition, selectedNode, setNodes, setEdges, saveHistory, edgeType]);

  const changeLevel = useCallback((nodeId: string, level: NodeLevel) => {
    saveHistory();
    setNodes(ns => ns.map(n =>
      n.id === nodeId ? { ...n, data: { ...n.data, level } } : n
    ));
    setContextMenu(null);
  }, [setNodes, saveHistory]);

  const applyColor = useCallback((color: string) => {
    if (!selectedNode) return;
    saveHistory();
    setNodes(ns => ns.map(n =>
      n.id === selectedNode ? { ...n, data: { ...n.data, color, colorMode } } : n
    ));
    setShowColorPicker(false);
  }, [selectedNode, colorMode, setNodes, saveHistory]);

  const deleteNode = useCallback((nodeId: string) => {
    saveHistory();
    setNodes(ns => ns.filter(n => n.id !== nodeId));
    setEdges(es => es.filter(e => e.source !== nodeId && e.target !== nodeId));
    setContextMenu(null);
    if (selectedNode === nodeId) setSelectedNode(null);
  }, [setNodes, setEdges, selectedNode, saveHistory]);

  const duplicateNode = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    saveHistory();
    const id = nextId();
    const newNode: Node = {
      ...node,
      id,
      position: { x: node.position.x + 40, y: node.position.y + 40 },
      data: {
        ...node.data,
        onLabelChange: (_id: string, label: string) => {
          setNodes(prev => prev.map(nd => nd.id === _id ? { ...nd, data: { ...nd.data, label } } : nd));
          dirtyRef.current = true;
        },
        onDataChange: (_id: string, updates: Record<string, any>) => {
          setNodes(prev => prev.map(nd => nd.id === _id ? { ...nd, data: { ...nd.data, ...updates } } : nd));
          dirtyRef.current = true;
        },
      },
    };
    setNodes(ns => [...ns, newNode]);
    setContextMenu(null);
  }, [nodes, setNodes, saveHistory]);

  const addChildNode = useCallback((parentId: string) => {
    saveHistory();
    const id = nextId();
    const parent = nodes.find(n => n.id === parentId);
    const newNode: Node = {
      id,
      type: "simpleNode",
      position: { x: (parent?.position.x || 0) + 60, y: (parent?.position.y || 0) + 120 },
      data: {
        title: "Novo Card",
        description: "",
        color: "#c4a46a",
        colorMode: "border",
        level: "text" as NodeLevel,
        onDataChange: (_id: string, updates: Record<string, any>) => {
          setNodes(prev => prev.map(nd => nd.id === _id ? { ...nd, data: { ...nd.data, ...updates } } : nd));
          dirtyRef.current = true;
        },
      },
    };
    setNodes(ns => [...ns, newNode]);
    setEdges(es => [...es, {
      id: `edge-${parentId}-${id}`,
      source: parentId,
      target: id,
      type: edgeType,
      style: edgeStyle,
      markerEnd: edgeMarker,
    }]);
    setSelectedNode(id);
    setContextMenu(null);
  }, [nodes, setNodes, setEdges, saveHistory, edgeType]);

  const convertToNote = useCallback((nodeId: string) => {
    saveHistory();
    setNodes(ns => ns.map(n => {
      if (n.id !== nodeId) return n;
      return {
        ...n,
        type: "noteCard",
        data: { ...n.data, content: (n.data as any).description || "", isExpanded: true },
      };
    }));
    setContextMenu(null);
  }, [setNodes, saveHistory]);

  const handleUndo = useCallback(() => {
    const prev = history.undo({ nodes, edges });
    if (prev) { setNodes(injectCallbacks(prev.nodes)); setEdges(prev.edges); }
  }, [history, nodes, edges, setNodes, setEdges, injectCallbacks]);

  const handleRedo = useCallback(() => {
    const next = history.redo({ nodes, edges });
    if (next) { setNodes(injectCallbacks(next.nodes)); setEdges(next.edges); }
  }, [history, nodes, edges, setNodes, setEdges, injectCallbacks]);

  const onAutoLayout = useCallback((dir: "TB" | "LR") => {
    saveHistory();
    setDirection(dir);
    const { nodes: ln, edges: le } = autoLayout(nodes, edges, dir);
    setNodes(injectCallbacks(ln));
    setEdges(le);
    setTimeout(() => fitView({ padding: 0.2 }), 50);
  }, [nodes, edges, setNodes, setEdges, fitView, saveHistory, injectCallbacks]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA") return;
      if (e.key === "Tab") { e.preventDefault(); if (selectedNode) addChildNode(selectedNode); }
      if (e.key === "Delete" || e.key === "Backspace") { if (selectedNode) deleteNode(selectedNode); }
      if (e.key === "d" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); if (selectedNode) duplicateNode(selectedNode); }
      if (e.key === "z" && (e.ctrlKey || e.metaKey) && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      if (e.key === "z" && (e.ctrlKey || e.metaKey) && e.shiftKey) { e.preventDefault(); handleRedo(); }
      if (e.key === "0" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); fitView({ padding: 0.2 }); }
      if (e.key === "s" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); saveMap(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedNode, addChildNode, deleteNode, duplicateNode, handleUndo, handleRedo, fitView, saveMap]);

  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [contextMenu]);

  if (!loaded) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={24} />
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 shrink-0 z-10"
        style={{ background: "hsl(var(--background))", borderBottom: "1px solid hsl(var(--border) / 0.2)" }}>
        <div className="flex items-center gap-3">
          <button onClick={handleClose} className="text-muted-foreground hover:text-foreground transition-colors text-xs font-ui">
            ← Voltar
          </button>
          <div className="w-px h-4" style={{ background: "hsl(var(--border) / 0.3)" }} />
          {editingTitle ? (
            <input
              value={mapTitle}
              onChange={e => setMapTitle(e.target.value)}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={e => { if (e.key === "Enter") setEditingTitle(false); }}
              autoFocus
              className="bg-transparent text-sm font-display font-semibold text-foreground outline-none border-b border-primary/30"
            />
          ) : (
            <button onClick={() => setEditingTitle(true)} className="flex items-center gap-1.5 text-sm font-display font-semibold text-foreground hover:text-primary transition-colors">
              {mapTitle} <Pencil size={12} className="text-muted-foreground" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Save status */}
          <div className="flex items-center gap-1.5 mr-2">
            {saving ? (
              <span className="text-[10px] font-ui text-primary/60 flex items-center gap-1">
                <Loader2 size={10} className="animate-spin" /> Salvando...
              </span>
            ) : lastSaved ? (
              <span className="text-[10px] font-ui text-muted-foreground/40">
                Salvo {lastSaved.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            ) : null}
          </div>
          <button onClick={() => saveMap()} className="p-2 rounded-lg text-muted-foreground hover:text-primary transition-all" title="Salvar (Ctrl+S)">
            <Save size={14} />
          </button>
          <button onClick={handleUndo} disabled={!history.canUndo}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-20 transition-all">
            <Undo2 size={14} />
          </button>
          <button onClick={handleRedo} disabled={!history.canRedo}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-20 transition-all">
            <Redo2 size={14} />
          </button>
          <div className="w-px h-4 mx-1" style={{ background: "hsl(var(--border) / 0.3)" }} />
          <button onClick={() => onAutoLayout("TB")}
            className="p-2 rounded-lg transition-all"
            style={{ color: direction === "TB" ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}>
            <ArrowUpDown size={14} />
          </button>
          <button onClick={() => onAutoLayout("LR")}
            className="p-2 rounded-lg transition-all"
            style={{ color: direction === "LR" ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}>
            <ArrowLeftRight size={14} />
          </button>
          <div className="w-px h-4 mx-1" style={{ background: "hsl(var(--border) / 0.3)" }} />
          <button onClick={() => fitView({ padding: 0.2 })} className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-all">
            <Maximize size={14} />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.1}
          maxZoom={3}
          snapToGrid
          snapGrid={[16, 16]}
          onNodeClick={(_, node) => setSelectedNode(node.id)}
          onPaneClick={() => { setSelectedNode(null); setShowColorPicker(false); }}
          onPaneContextMenu={e => e.preventDefault()}
          onNodeContextMenu={(event, node) => {
            event.preventDefault();
            setContextMenu({ x: event.clientX, y: event.clientY, nodeId: node.id });
            setSelectedNode(node.id);
          }}
          className="bg-background"
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="rgba(196,164,106,0.04)" />
          <MiniMap
            nodeColor={() => "hsl(var(--primary) / 0.4)"}
            style={{
              background: "hsl(var(--card) / 0.9)",
              border: "1px solid hsl(var(--border) / 0.3)",
              borderRadius: 12,
            }}
            pannable zoomable
          />
        </ReactFlow>

        {/* Bottom Toolbar */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-3 py-2 rounded-2xl shadow-xl"
          style={{
            background: "rgba(22,19,15,0.95)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(196,164,106,0.2)",
          }}>
          <ToolbarBtn icon={Plus} label="Card" onClick={() => addNode("simpleNode")} />
          <ToolbarBtn icon={StickyNote} label="Nota" onClick={() => addNode("noteCard")} />
          <div className="w-px h-5" style={{ background: "rgba(196,164,106,0.15)" }} />
          <ToolbarBtn icon={Link2} label={edgeType === "smoothstep" ? "Curva" : edgeType === "straight" ? "Reta" : "Bézier"}
            onClick={() => changeEdgeType(edgeType === "smoothstep" ? "straight" : edgeType === "straight" ? "default" : "smoothstep")} />
          <ToolbarBtn icon={Palette} label="Cor" onClick={() => setShowColorPicker(!showColorPicker)} active={showColorPicker} />
        </div>

        {/* Color Picker Popover */}
        {showColorPicker && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 rounded-2xl p-4 shadow-xl animate-fade-in"
            style={{
              background: "rgba(22,19,15,0.97)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(196,164,106,0.2)",
              minWidth: 220,
            }}>
            <p className="text-[11px] font-ui text-muted-foreground mb-3">
              🎨 Cor do Card {!selectedNode && <span className="text-primary/40">(selecione um card)</span>}
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {manualColors.map(c => (
                <button key={c.value} onClick={() => applyColor(c.value)}
                  className="w-7 h-7 rounded-full border-2 transition-all hover:scale-110 active:scale-95"
                  style={{ background: c.value, borderColor: "transparent" }}
                  title={c.name} disabled={!selectedNode} />
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setColorMode("border")}
                className="flex-1 py-1.5 rounded-lg text-[11px] font-ui transition-all"
                style={{
                  background: colorMode === "border" ? "rgba(196,164,106,0.12)" : "transparent",
                  border: `1px solid ${colorMode === "border" ? "rgba(196,164,106,0.3)" : "rgba(196,164,106,0.1)"}`,
                  color: colorMode === "border" ? "#c4a46a" : "#8a7d6a",
                }}>
                Borda
              </button>
              <button onClick={() => setColorMode("fill")}
                className="flex-1 py-1.5 rounded-lg text-[11px] font-ui transition-all"
                style={{
                  background: colorMode === "fill" ? "rgba(196,164,106,0.12)" : "transparent",
                  border: `1px solid ${colorMode === "fill" ? "rgba(196,164,106,0.3)" : "rgba(196,164,106,0.1)"}`,
                  color: colorMode === "fill" ? "#c4a46a" : "#8a7d6a",
                }}>
                Fundo
              </button>
            </div>
          </div>
        )}

        {/* Context Menu */}
        {contextMenu && (
          <div
            className="fixed z-[100] rounded-xl py-1.5 px-1.5 shadow-xl animate-fade-in"
            style={{
              top: contextMenu.y,
              left: contextMenu.x,
              background: "rgba(22,19,15,0.97)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(196,164,106,0.2)",
              minWidth: 200,
            }}
            onClick={e => e.stopPropagation()}
          >
            <CtxItem icon={Pencil} label="Editar" onClick={() => { setContextMenu(null); }} />
            <CtxItem icon={Palette} label="Mudar cor" onClick={() => { setContextMenu(null); setShowColorPicker(true); }} />
            {nodes.find(n => n.id === contextMenu.nodeId)?.type === "simpleNode" && (
              <>
                <div className="h-px mx-2 my-1" style={{ background: "rgba(196,164,106,0.1)" }} />
                <p className="px-3 py-1 text-[9px] font-ui uppercase tracking-wider text-muted-foreground/50">Importância</p>
                <CtxItem icon={Heading1} label="Título (principal)" onClick={() => changeLevel(contextMenu.nodeId, "title")} />
                <CtxItem icon={Heading2} label="Subtítulo" onClick={() => changeLevel(contextMenu.nodeId, "subtitle")} />
                <CtxItem icon={AlignLeft} label="Texto (detalhe)" onClick={() => changeLevel(contextMenu.nodeId, "text")} />
                <div className="h-px mx-2 my-1" style={{ background: "rgba(196,164,106,0.1)" }} />
                <CtxItem icon={StickyNote} label="Converter em Nota" onClick={() => convertToNote(contextMenu.nodeId)} />
              </>
            )}
            <CtxItem icon={PlusCircle} label="Adicionar filho" onClick={() => addChildNode(contextMenu.nodeId)} />
            <CtxItem icon={Copy} label="Duplicar" onClick={() => duplicateNode(contextMenu.nodeId)} />
            <div className="h-px mx-2 my-1" style={{ background: "rgba(196,164,106,0.1)" }} />
            <CtxItem icon={Trash2} label="Excluir" danger onClick={() => deleteNode(contextMenu.nodeId)} />
          </div>
        )}
      </div>
    </div>
  );
}

function ToolbarBtn({ icon: Icon, label, onClick, active }: { icon: React.ElementType; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl text-[12px] font-ui font-semibold tracking-wide transition-all active:scale-95"
      style={{
        background: active ? "rgba(196,164,106,0.12)" : "transparent",
        border: `1px solid ${active ? "rgba(196,164,106,0.3)" : "transparent"}`,
        color: active ? "#c4a46a" : "#c4b89e",
      }}>
      <Icon size={15} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function CtxItem({ icon: Icon, label, onClick, danger }: { icon: React.ElementType; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-[13px] font-ui transition-all"
      style={{ color: danger ? "#c97a7a" : "#c4b89e" }}
      onMouseEnter={e => {
        (e.target as HTMLElement).style.background = danger ? "rgba(201,122,122,0.08)" : "rgba(196,164,106,0.08)";
        (e.target as HTMLElement).style.color = danger ? "#c97a7a" : "#ede4d3";
      }}
      onMouseLeave={e => {
        (e.target as HTMLElement).style.background = "transparent";
        (e.target as HTMLElement).style.color = danger ? "#c97a7a" : "#c4b89e";
      }}>
      <Icon size={14} />
      {label}
    </button>
  );
}

export default function ManualMindMapCanvas({ userCodeId, mapId, onClose }: ManualCanvasProps) {
  return (
    <ReactFlowProvider>
      <ManualCanvas userCodeId={userCodeId} mapId={mapId} onClose={onClose} />
    </ReactFlowProvider>
  );
}
