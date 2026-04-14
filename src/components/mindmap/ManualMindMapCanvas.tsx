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
} from "lucide-react";
import dagre from "dagre";

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

// ── Handle styles ──
const handleStyle = {
  width: 8, height: 8,
  background: "rgba(196,164,106,0.3)",
  border: "none",
  opacity: 0,
  transition: "all 0.15s ease",
};

// ── Custom Nodes ──

function ManualRootNode({ data, id }: NodeProps) {
  const d = data as Record<string, any>;
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(d.label as string);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

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

function SimpleNode({ data, id }: NodeProps) {
  const d = data as Record<string, any>;
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(d.title as string);
  const [desc, setDesc] = useState((d.description as string) || "");
  const inputRef = useRef<HTMLInputElement>(null);
  const color = (d.color as string) || "#c4a46a";
  const colorMode = (d.colorMode as string) || "border";

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    d.onDataChange?.(id, { title: title || "Novo card", description: desc });
  };

  return (
    <div
      className="rounded-[14px] min-w-[180px] max-w-[260px] relative group cursor-grab active:cursor-grabbing transition-all"
      style={{
        background: colorMode === "fill" ? `${color}0F` : "hsl(var(--card))",
        border: `1px solid ${colorMode === "fill" ? `${color}40` : "hsl(var(--border))"}`,
        borderLeft: `3px solid ${color}`,
        padding: "14px 18px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
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
        <div className="space-y-1">
          <input ref={inputRef} value={title} onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setTitle(d.title as string); setEditing(false); } }}
            className="bg-transparent text-[15px] font-display font-semibold text-foreground w-full outline-none border-b border-primary/20 pb-1"
            placeholder="Título" />
          <input value={desc} onChange={e => setDesc(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === "Enter") commit(); }}
            className="bg-transparent text-[12px] font-ui text-muted-foreground w-full outline-none"
            placeholder="Descrição (opcional)" />
        </div>
      ) : (
        <>
          <p className="font-display text-[15px] font-semibold text-foreground">{d.title as string}</p>
          {d.description && (
            <p className="font-ui text-[12px] text-muted-foreground mt-1 leading-relaxed">{d.description as string}</p>
          )}
        </>
      )}
    </div>
  );
}

function NoteCardNode({ data, id }: NodeProps) {
  const d = data as Record<string, any>;
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(d.title as string);
  const [content, setContent] = useState((d.content as string) || "");
  const [expanded, setExpanded] = useState((d.isExpanded as boolean) ?? true);
  const color = (d.color as string) || "#c4a46a";
  const colorMode = (d.colorMode as string) || "border";
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) titleRef.current?.focus();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    d.onDataChange?.(id, { title: title || "Nota", content });
  };

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
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        {editing ? (
          <input ref={titleRef} value={title} onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setTitle(d.title as string); setEditing(false); } }}
            className="bg-transparent text-[15px] font-display font-semibold text-foreground flex-1 outline-none border-b border-primary/20"
            placeholder="Título" />
        ) : (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <StickyNote size={14} style={{ color, flexShrink: 0 }} />
            <p className="font-display text-[15px] font-semibold text-foreground truncate">{d.title as string}</p>
          </div>
        )}
        <button onClick={() => setExpanded(!expanded)} className="ml-2 text-muted-foreground/50 hover:text-primary transition-colors flex-shrink-0">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>
      {/* Body */}
      {expanded ? (
        <div className="px-4 pb-4">
          {editing ? (
            <textarea value={content} onChange={e => setContent(e.target.value)}
              onBlur={commit}
              className="w-full min-h-[120px] max-h-[300px] bg-transparent text-[13px] font-body text-foreground/75 leading-relaxed outline-none resize-none"
              placeholder="Escreva suas anotações..." />
          ) : (
            <p className="text-[13px] font-body leading-relaxed whitespace-pre-wrap"
              style={{ color: "hsl(var(--foreground) / 0.75)" }}>
              {(d.content as string) || <span className="italic text-muted-foreground/40">Duplo clique para escrever...</span>}
            </p>
          )}
        </div>
      ) : (
        <div className="px-4 pb-3">
          <p className="text-[12px] font-body text-muted-foreground line-clamp-2">
            {(d.content as string) || "Sem conteúdo"}
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

const defaultEdgeOptions = {
  type: "smoothstep" as const,
  style: { stroke: "rgba(196,164,106,0.2)", strokeWidth: 1.5 },
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

// ── Main ──

let idCounter = 1;
const nextId = () => `manual-${idCounter++}`;

function ManualCanvas({ onClose }: { onClose: () => void }) {
  const { fitView, screenToFlowPosition } = useReactFlow();

  const rootId = useRef(nextId());
  const initialNodes: Node[] = [
    {
      id: rootId.current,
      type: "manualRoot",
      position: { x: 0, y: 0 },
      data: { label: "Clique para nomear" },
    },
  ];
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorMode, setColorMode] = useState<"border" | "fill">("border");
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const [mapTitle, setMapTitle] = useState("Meu Mapa Mental");
  const [editingTitle, setEditingTitle] = useState(false);
  const [direction, setDirection] = useState<"TB" | "LR">("TB");

  const history = useUndoRedo();

  // Helper to inject callbacks into node data
  const injectCallbacks = useCallback((ns: Node[]): Node[] => {
    return ns.map(n => ({
      ...n,
      data: {
        ...n.data,
        onLabelChange: (_id: string, label: string) => {
          setNodes(prev => prev.map(nd => nd.id === _id ? { ...nd, data: { ...nd.data, label } } : nd));
        },
        onDataChange: (_id: string, updates: Record<string, any>) => {
          setNodes(prev => prev.map(nd => nd.id === _id ? { ...nd, data: { ...nd.data, ...updates } } : nd));
        },
      },
    }));
  }, [setNodes]);

  // Save history on meaningful changes
  const saveHistory = useCallback(() => {
    history.pushState({ nodes, edges });
  }, [nodes, edges, history]);

  const onConnect: OnConnect = useCallback((connection: Connection) => {
    saveHistory();
    setEdges(eds => addEdge({ ...connection, type: "smoothstep", style: { stroke: "rgba(196,164,106,0.25)", strokeWidth: 1.5 } }, eds));
  }, [setEdges, saveHistory]);

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
        isExpanded: true,
        onLabelChange: (_id: string, label: string) => {
          setNodes(prev => prev.map(nd => nd.id === _id ? { ...nd, data: { ...nd.data, label } } : nd));
        },
        onDataChange: (_id: string, updates: Record<string, any>) => {
          setNodes(prev => prev.map(nd => nd.id === _id ? { ...nd, data: { ...nd.data, ...updates } } : nd));
        },
      },
    };

    // Auto-connect to selected node
    const newEdges: Edge[] = [];
    if (selectedNode) {
      newEdges.push({
        id: `edge-${selectedNode}-${id}`,
        source: selectedNode,
        target: id,
        type: "smoothstep",
        style: { stroke: "rgba(196,164,106,0.25)", strokeWidth: 1.5 },
      });
    }

    setNodes(ns => [...ns, newNode]);
    setEdges(es => [...es, ...newEdges]);
    setSelectedNode(id);
  }, [screenToFlowPosition, selectedNode, setNodes, setEdges, saveHistory]);

  // Double click on pane to create node
  const onPaneDoubleClick = useCallback((event: React.MouseEvent) => {
    saveHistory();
    const id = nextId();
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const newNode: Node = {
      id,
      type: "simpleNode",
      position,
      data: {
        title: "Novo Card",
        description: "",
        color: "#c4a46a",
        colorMode: "border",
        onDataChange: (_id: string, updates: Record<string, any>) => {
          setNodes(prev => prev.map(nd => nd.id === _id ? { ...nd, data: { ...nd.data, ...updates } } : nd));
        },
      },
    };
    setNodes(ns => [...ns, newNode]);
    setSelectedNode(id);
  }, [screenToFlowPosition, setNodes, saveHistory]);

  // Apply color
  const applyColor = useCallback((color: string) => {
    if (!selectedNode) return;
    saveHistory();
    setNodes(ns => ns.map(n =>
      n.id === selectedNode ? { ...n, data: { ...n.data, color, colorMode } } : n
    ));
    setShowColorPicker(false);
  }, [selectedNode, colorMode, setNodes, saveHistory]);

  // Context menu actions
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
        },
        onDataChange: (_id: string, updates: Record<string, any>) => {
          setNodes(prev => prev.map(nd => nd.id === _id ? { ...nd, data: { ...nd.data, ...updates } } : nd));
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
        onDataChange: (_id: string, updates: Record<string, any>) => {
          setNodes(prev => prev.map(nd => nd.id === _id ? { ...nd, data: { ...nd.data, ...updates } } : nd));
        },
      },
    };
    setNodes(ns => [...ns, newNode]);
    setEdges(es => [...es, {
      id: `edge-${parentId}-${id}`,
      source: parentId,
      target: id,
      type: "smoothstep",
      style: { stroke: "rgba(196,164,106,0.25)", strokeWidth: 1.5 },
    }]);
    setSelectedNode(id);
    setContextMenu(null);
  }, [nodes, setNodes, setEdges, saveHistory]);

  const convertToNote = useCallback((nodeId: string) => {
    saveHistory();
    setNodes(ns => ns.map(n => {
      if (n.id !== nodeId) return n;
      return {
        ...n,
        type: "noteCard",
        data: {
          ...n.data,
          content: (n.data as any).description || "",
          isExpanded: true,
        },
      };
    }));
    setContextMenu(null);
  }, [setNodes, saveHistory]);

  // Undo/Redo
  const handleUndo = useCallback(() => {
    const prev = history.undo({ nodes, edges });
    if (prev) {
      setNodes(injectCallbacks(prev.nodes));
      setEdges(prev.edges);
    }
  }, [history, nodes, edges, setNodes, setEdges, injectCallbacks]);

  const handleRedo = useCallback(() => {
    const next = history.redo({ nodes, edges });
    if (next) {
      setNodes(injectCallbacks(next.nodes));
      setEdges(next.edges);
    }
  }, [history, nodes, edges, setNodes, setEdges, injectCallbacks]);

  // Auto-layout
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
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedNode, addChildNode, deleteNode, duplicateNode, handleUndo, handleRedo, fitView]);

  // Close context on click away
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [contextMenu]);

  return (
    <div className="h-full w-full flex flex-col relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 shrink-0 z-10"
        style={{ background: "hsl(var(--background))", borderBottom: "1px solid hsl(var(--border) / 0.2)" }}>
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors text-xs font-ui">
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
          onDoubleClick={onPaneDoubleClick}
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
            <CtxItem icon={Pencil} label="Editar" onClick={() => { setContextMenu(null); /* node handles edit via double click */ }} />
            <CtxItem icon={Palette} label="Mudar cor" onClick={() => { setContextMenu(null); setShowColorPicker(true); }} />
            {nodes.find(n => n.id === contextMenu.nodeId)?.type === "simpleNode" && (
              <CtxItem icon={StickyNote} label="Converter em Nota" onClick={() => convertToNote(contextMenu.nodeId)} />
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

// Wrap with provider
export default function ManualMindMapCanvas({ onClose }: { onClose: () => void }) {
  return (
    <ReactFlowProvider>
      <ManualCanvas onClose={onClose} />
    </ReactFlowProvider>
  );
}
