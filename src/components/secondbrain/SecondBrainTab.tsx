import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { haptic } from "@/hooks/useHaptic";
import { Brain, Mic, MicOff, Sparkles, ChevronDown, ChevronUp, Link2, Search, X, MessageSquare, Map, BarChart3, MoreHorizontal, Pencil, Archive, Trash2, Unlink, ArchiveRestore, Check, Sun, LayoutGrid, Zap } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Json } from "@/integrations/supabase/types";

const ThoughtGraph = lazy(() => import("./ThoughtGraph"));
const PatternsView = lazy(() => import("./PatternsView"));
const TodayDashboard = lazy(() => import("./TodayDashboard"));
const ParaBoard = lazy(() => import("./ParaBoard"));
const FocusMode = lazy(() => import("./FocusMode"));

// ── Types ──
type ThoughtType = "problema" | "insight" | "estudo" | "reflexão" | "oração" | "decisão" | "emocional" | "ideia" | "pergunta";

interface AIConnection {
  target_id: string;
  type: string;
  strength: number;
  explanation: string;
}

interface ThoughtAnalysis {
  detected_type?: ThoughtType;
  psychological_analysis?: { pattern: string; explanation: string; reframe: string };
  biblical_analysis?: { principle: string; verses: string[]; application: string };
  diagnosis?: { summary: string; action: string; question: string };
  keywords?: string[];
  emotion_score?: { valence: number; intensity: number };
  resolved_connections?: AIConnection[];
}

interface Thought {
  id: string;
  user_code_id: string;
  content: string;
  type: string;
  keywords: string[];
  analysis: ThoughtAnalysis | null;
  emotion_valence: number;
  emotion_intensity: number;
  is_favorite: boolean;
  archived: boolean;
  created_at: string;
}

const THOUGHT_TYPES: { key: ThoughtType; emoji: string; label: string; color: string }[] = [
  { key: "problema", emoji: "🔴", label: "Problema", color: "#c97a7a" },
  { key: "insight", emoji: "💡", label: "Insight", color: "#c4a46a" },
  { key: "estudo", emoji: "📖", label: "Estudo", color: "#7ba3c9" },
  { key: "reflexão", emoji: "🪞", label: "Reflexão", color: "#b08db5" },
  { key: "oração", emoji: "🙏", label: "Oração", color: "#d4b87a" },
  { key: "decisão", emoji: "⚖️", label: "Decisão", color: "#d4854a" },
  { key: "emocional", emoji: "💛", label: "Emocional", color: "#e8a0b4" },
  { key: "ideia", emoji: "💭", label: "Ideia", color: "#8b9e7a" },
  { key: "pergunta", emoji: "❓", label: "Pergunta", color: "#6a9c8a" },
];

const getTypeInfo = (type: string) => THOUGHT_TYPES.find(t => t.key === type) || THOUGHT_TYPES[3];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "ontem";
  return `há ${days} dias`;
}

type ViewMode = "today" | "para" | "capture" | "graph" | "patterns";

// ── Main Component ──
export default function SecondBrainTab({ userCodeId }: { userCodeId: string }) {
  const [viewMode, setViewMode] = useState<ViewMode>("today");
  const [focusOpen, setFocusOpen] = useState(false);
  const [content, setContent] = useState("");
  const [selectedType, setSelectedType] = useState<ThoughtType | "auto">("auto");
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [isListening, setIsListening] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { loadThoughts(); }, [userCodeId]);

  const loadThoughts = async () => {
    const { data } = await supabase
      .from("thoughts").select("*").eq("user_code_id", userCodeId)
      .order("created_at", { ascending: false }).limit(80);
    if (data) {
      setThoughts(data.map(t => ({
        ...t,
        keywords: (t.keywords as string[]) || [],
        analysis: t.analysis ? (t.analysis as unknown as ThoughtAnalysis) : null,
        emotion_valence: Number(t.emotion_valence) || 0,
        emotion_intensity: Number(t.emotion_intensity) || 0,
        archived: Boolean((t as any).archived),
      })));
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.max(120, el.scrollHeight) + "px";
  };

  const registerThought = async () => {
    if (!content.trim() || isRegistering) return;
    setIsRegistering(true);
    haptic("medium");
    const type = selectedType === "auto" ? "reflexão" : selectedType;
    const { data: inserted, error } = await supabase
      .from("thoughts").insert({ user_code_id: userCodeId, content: content.trim(), type, keywords: [] as string[] })
      .select().single();
    if (error || !inserted) {
      toast({ title: "Erro ao salvar", description: error?.message, variant: "destructive" });
      setIsRegistering(false); return;
    }
    const newThought: Thought = {
      ...inserted,
      keywords: [],
      analysis: null,
      emotion_valence: 0,
      emotion_intensity: 0,
      archived: false,
    } as Thought;
    setThoughts(prev => [newThought, ...prev]);
    setContent(""); setSelectedType("auto");
    if (textareaRef.current) textareaRef.current.style.height = "120px";
    setIsRegistering(false);
    analyzeThought(newThought);
  };

  const analyzeThought = async (thought: Thought) => {
    setAnalyzingIds(prev => new Set(prev).add(thought.id));
    try {
      // Send richer context: id + content + type + keywords for the AI to reference by index
      const pastForContext = thoughts
        .filter(t => t.id !== thought.id && !t.archived)
        .slice(0, 25)
        .map(t => ({ id: t.id, type: t.type, content: t.content, keywords: t.keywords }));

      const { data, error } = await supabase.functions.invoke("analyze-thought", {
        body: { content: thought.content, pastThoughts: pastForContext },
      });
      if (error || data?.error) {
        if (data?.error) toast({ title: "IA indisponível", description: data.error, variant: "destructive" });
        return;
      }
      const analysis = data.analysis as ThoughtAnalysis;
      const detectedType = analysis.detected_type || thought.type;
      const keywords = analysis.keywords || [];
      const valence = analysis.emotion_score?.valence ?? 0;
      const intensity = analysis.emotion_score?.intensity ?? 0;

      await supabase.from("thoughts").update({
        analysis: analysis as unknown as Json,
        type: selectedType === "auto" ? detectedType : thought.type,
        keywords, emotion_valence: valence, emotion_intensity: intensity,
      }).eq("id", thought.id);

      setThoughts(prev => prev.map(t => t.id === thought.id
        ? { ...t, analysis, type: selectedType === "auto" ? detectedType : t.type, keywords, emotion_valence: valence, emotion_intensity: intensity } : t
      ));

      const conns = analysis.resolved_connections || [];
      if (conns.length > 0) await saveAIConnections(thought.id, conns);
    } catch (e) {
      console.error("Analysis failed:", e);
    } finally {
      setAnalyzingIds(prev => { const n = new Set(prev); n.delete(thought.id); return n; });
    }
  };

  const saveAIConnections = async (thoughtId: string, conns: AIConnection[]) => {
    // Deduplicate by undirected pair (a<b)
    const rows = conns.map(c => {
      const a = thoughtId < c.target_id ? thoughtId : c.target_id;
      const b = thoughtId < c.target_id ? c.target_id : thoughtId;
      return {
        user_code_id: userCodeId,
        thought_a: a,
        thought_b: b,
        connection_type: c.type || "semantic",
        strength: c.strength,
        explanation: c.explanation,
      };
    });
    const { error } = await supabase.from("thought_connections").upsert(rows as any, {
      onConflict: "thought_a,thought_b",
    });
    if (error) console.error("connection upsert error:", error);
  };

  const updateThoughtContent = async (id: string, newContent: string) => {
    const { error } = await supabase.from("thoughts").update({ content: newContent.trim() }).eq("id", id);
    if (error) {
      toast({ title: "Erro ao editar", description: error.message, variant: "destructive" });
      return false;
    }
    setThoughts(prev => prev.map(t => t.id === id ? { ...t, content: newContent.trim() } : t));
    toast({ title: "Pensamento atualizado" });
    return true;
  };

  const archiveThought = async (id: string, archived: boolean) => {
    const { error } = await supabase.from("thoughts").update({ archived } as any).eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    setThoughts(prev => prev.map(t => t.id === id ? { ...t, archived } : t));
    toast({ title: archived ? "Arquivado" : "Restaurado", description: archived ? "Some do grafo, mantido no histórico." : "Voltou para o grafo." });
    haptic("light");
  };

  const removeConnections = async (id: string) => {
    const { error } = await supabase.from("thought_connections").delete()
      .eq("user_code_id", userCodeId)
      .or(`thought_a.eq.${id},thought_b.eq.${id}`);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Conexões removidas" });
    haptic("light");
  };

  const deleteThought = async (id: string) => {
    // Remove connections first to avoid orphans
    await supabase.from("thought_connections").delete()
      .eq("user_code_id", userCodeId)
      .or(`thought_a.eq.${id},thought_b.eq.${id}`);
    const { error } = await supabase.from("thoughts").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      return;
    }
    setThoughts(prev => prev.filter(t => t.id !== id));
    setConfirmDeleteId(null);
    if (expandedId === id) setExpandedId(null);
    toast({ title: "Excluído permanentemente" });
    haptic("medium");
  };

  const toggleVoice = () => {
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast({ title: "Navegador não suporta gravação de voz" }); return; }
    const recognition = new SR();
    recognition.lang = "pt-BR"; recognition.continuous = true; recognition.interimResults = true;
    recognition.onresult = (e: any) => { let t = ""; for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript; setContent(t); };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start(); recognitionRef.current = recognition; setIsListening(true); haptic("light");
  };

  const visible = thoughts.filter(t => showArchived ? true : !t.archived);
  const filtered = searchQuery
    ? visible.filter(t => t.content.toLowerCase().includes(searchQuery.toLowerCase()) || t.keywords.some(k => k.toLowerCase().includes(searchQuery.toLowerCase())))
    : visible;

  const TABS: { key: ViewMode; icon: any; label: string }[] = [
    { key: "today", icon: Sun, label: "Hoje" },
    { key: "para", icon: LayoutGrid, label: "PARA" },
    { key: "capture", icon: MessageSquare, label: "Captura" },
    { key: "graph", icon: Map, label: "Grafo" },
    { key: "patterns", icon: BarChart3, label: "Padrões" },
  ];

  return (
    <div className="w-full h-full flex flex-col">
      {/* Tab navigation */}
      <div className="flex items-center gap-1 px-4 pt-3 pb-2 flex-shrink-0">
        <Brain size={18} className="text-primary mr-1" />
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setViewMode(tab.key); haptic("light"); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold font-ui transition-all"
            style={{
              background: viewMode === tab.key ? "hsl(var(--primary) / 0.12)" : "transparent",
              color: viewMode === tab.key ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
              border: viewMode === tab.key ? "1px solid hsl(var(--primary) / 0.25)" : "1px solid transparent",
            }}
          >
            <tab.icon size={13} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {viewMode === "capture" && (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 py-2 pb-28">
            {/* Capture Area */}
            <div className="rounded-2xl p-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <textarea
                ref={textareaRef} value={content} onChange={handleTextareaChange}
                onKeyDown={e => { if (e.ctrlKey && e.key === "Enter") registerThought(); }}
                placeholder="O que está na sua mente?"
                className="w-full bg-transparent border-none outline-none resize-none text-foreground placeholder:text-muted-foreground/50 placeholder:italic font-body text-base leading-relaxed"
                style={{ minHeight: 120 }}
              />
              <div className="flex flex-wrap gap-1.5 mt-3 mb-3">
                <button onClick={() => setSelectedType("auto")}
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all"
                  style={{ background: selectedType === "auto" ? "hsl(var(--primary) / 0.15)" : "transparent", color: selectedType === "auto" ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))", border: selectedType === "auto" ? "1px solid hsl(var(--primary) / 0.3)" : "1px solid hsl(var(--border))" }}>
                  ✨ Auto
                </button>
                {THOUGHT_TYPES.map(t => (
                  <button key={t.key} onClick={() => { setSelectedType(t.key); haptic("light"); }}
                    className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all"
                    style={{ background: selectedType === t.key ? `${t.color}22` : "transparent", color: selectedType === t.key ? t.color : "hsl(var(--muted-foreground))", border: selectedType === t.key ? `1px solid ${t.color}44` : "1px solid hsl(var(--border))" }}>
                    {t.emoji} {t.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={toggleVoice} className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
                  style={{ background: isListening ? "hsl(var(--destructive) / 0.15)" : "hsl(var(--muted) / 0.3)", color: isListening ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))" }}>
                  {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
                <div className="flex-1" />
                <button onClick={registerThought} disabled={!content.trim() || isRegistering}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold font-ui transition-all disabled:opacity-40 active:scale-95"
                  style={{ background: "hsl(var(--primary) / 0.15)", color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.3)" }}>
                  <Sparkles size={16} />
                  {isRegistering ? "Registrando..." : "Registrar"}
                </button>
              </div>
            </div>

            {/* Feed header */}
            <div className="flex items-center justify-between mt-6 mb-3">
              <h3 className="text-xs font-bold uppercase tracking-[2px] text-muted-foreground/60 font-ui">Pensamentos Recentes</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowArchived(v => !v)}
                  className="text-[10px] font-bold uppercase tracking-wider font-ui px-2 py-1 rounded-md transition-colors"
                  style={{
                    background: showArchived ? "hsl(var(--primary) / 0.12)" : "transparent",
                    color: showArchived ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                    border: `1px solid ${showArchived ? "hsl(var(--primary) / 0.3)" : "hsl(var(--border))"}`,
                  }}
                  title="Mostrar arquivados"
                >
                  {showArchived ? "Com arquivados" : "Sem arquivados"}
                </button>
                <button onClick={() => { setShowSearch(!showSearch); if (showSearch) setSearchQuery(""); }} className="text-muted-foreground hover:text-foreground transition-colors">
                  {showSearch ? <X size={16} /> : <Search size={16} />}
                </button>
              </div>
            </div>
            {showSearch && (
              <input autoFocus value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar pensamentos..."
                className="w-full mb-3 px-3 py-2 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/40" />
            )}

            <div className="space-y-2.5">
              {filtered.map(thought => (
                <ThoughtCard
                  key={thought.id}
                  thought={thought}
                  isExpanded={expandedId === thought.id}
                  isAnalyzing={analyzingIds.has(thought.id)}
                  isConfirmingDelete={confirmDeleteId === thought.id}
                  onToggle={() => { setExpandedId(expandedId === thought.id ? null : thought.id); haptic("light"); }}
                  onEdit={(newText) => updateThoughtContent(thought.id, newText)}
                  onArchive={() => archiveThought(thought.id, !thought.archived)}
                  onRemoveConnections={() => removeConnections(thought.id)}
                  onRequestDelete={() => setConfirmDeleteId(thought.id)}
                  onCancelDelete={() => setConfirmDeleteId(null)}
                  onConfirmDelete={() => deleteThought(thought.id)}
                />
              ))}
              {filtered.length === 0 && (
                <p className="text-center text-muted-foreground/50 text-sm py-8 font-body italic">
                  {searchQuery ? "Nenhum pensamento encontrado" : "Nenhum pensamento registrado ainda"}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {viewMode === "graph" && (
        <div className="flex-1 relative">
          <Suspense fallback={<div className="flex items-center justify-center h-full"><span className="text-muted-foreground/50 text-sm">Carregando...</span></div>}>
            <ThoughtGraph userCodeId={userCodeId} />
          </Suspense>
        </div>
      )}

      {viewMode === "patterns" && (
        <div className="flex-1 overflow-y-auto">
          <Suspense fallback={<div className="flex items-center justify-center py-20"><span className="text-muted-foreground/50 text-sm">Carregando...</span></div>}>
            <PatternsView userCodeId={userCodeId} />
          </Suspense>
        </div>
      )}
    </div>
  );
}

// ── Thought Card ──
function ThoughtCard({
  thought, isExpanded, isAnalyzing, isConfirmingDelete,
  onToggle, onEdit, onArchive, onRemoveConnections, onRequestDelete, onCancelDelete, onConfirmDelete,
}: {
  thought: Thought;
  isExpanded: boolean;
  isAnalyzing: boolean;
  isConfirmingDelete: boolean;
  onToggle: () => void;
  onEdit: (newText: string) => Promise<boolean>;
  onArchive: () => void;
  onRemoveConnections: () => void;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}) {
  const typeInfo = getTypeInfo(thought.type);
  const analysis = thought.analysis;
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(thought.content);

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const startEdit = () => { setEditValue(thought.content); setEditing(true); setMenuOpen(false); };
  const saveEdit = async () => {
    if (editValue.trim() && editValue.trim() !== thought.content) {
      const ok = await onEdit(editValue);
      if (ok) setEditing(false);
    } else {
      setEditing(false);
    }
  };

  return (
    <div className="rounded-xl transition-all duration-200 cursor-pointer relative"
      style={{
        background: "hsl(var(--card))",
        border: "1px solid hsl(var(--border))",
        borderLeft: `3px solid ${typeInfo.color}`,
        opacity: thought.archived ? 0.55 : 1,
      }}
      onClick={() => { if (!editing && !menuOpen) onToggle(); }}>
      <div className="p-3.5">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs whitespace-nowrap" style={{ color: typeInfo.color }}>{typeInfo.emoji} {typeInfo.label}</span>
            <span className="text-[10px] text-muted-foreground/50 whitespace-nowrap">{timeAgo(thought.created_at)}</span>
            {thought.archived && (
              <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground/60 px-1.5 py-0.5 rounded bg-muted/30">arquivado</span>
            )}
          </div>
          <div className="flex items-center gap-1" onClick={stop}>
            {isAnalyzing && <span className="text-[10px] text-primary animate-pulse font-ui">Analisando...</span>}
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }}
              className="p-1 rounded-md hover:bg-muted/40 text-muted-foreground/60 hover:text-foreground transition-colors"
              aria-label="Opções"
            >
              <MoreHorizontal size={14} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onToggle(); }} className="p-1 text-muted-foreground/40">
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {/* Action menu */}
        {menuOpen && (
          <div
            className="absolute right-3 top-10 z-30 rounded-lg shadow-lg p-1 min-w-[180px] animate-fade-in"
            style={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }}
            onClick={stop}
          >
            <MenuItem icon={Pencil} label="Editar" onClick={startEdit} />
            <MenuItem
              icon={thought.archived ? ArchiveRestore : Archive}
              label={thought.archived ? "Restaurar" : "Arquivar"}
              onClick={() => { onArchive(); setMenuOpen(false); }}
            />
            <MenuItem icon={Unlink} label="Remover conexões" onClick={() => { onRemoveConnections(); setMenuOpen(false); }} />
            <div className="my-1 h-px bg-border" />
            <MenuItem icon={Trash2} label="Excluir permanentemente" danger onClick={() => { onRequestDelete(); setMenuOpen(false); }} />
          </div>
        )}

        {/* Editing mode */}
        {editing ? (
          <div onClick={stop} className="space-y-2">
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              autoFocus
              className="w-full text-sm font-body bg-background/50 border border-border rounded-lg p-2 outline-none focus:border-primary/40 resize-y"
              style={{ minHeight: 80 }}
            />
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => setEditing(false)} className="text-[11px] font-ui text-muted-foreground px-2 py-1">Cancelar</button>
              <button onClick={saveEdit} className="flex items-center gap-1 text-[11px] font-ui font-bold px-2.5 py-1 rounded-md"
                style={{ background: "hsl(var(--primary) / 0.15)", color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.3)" }}>
                <Check size={12} /> Salvar
              </button>
            </div>
          </div>
        ) : (
          <p className={`text-sm text-foreground/80 font-body leading-relaxed ${!isExpanded ? "line-clamp-2" : ""}`}>{thought.content}</p>
        )}

        {!isExpanded && !editing && analysis?.diagnosis?.summary && (
          <p className="text-[11px] text-muted-foreground/60 mt-1.5 italic font-body line-clamp-1">💊 {analysis.diagnosis.summary}</p>
        )}
        {!isExpanded && !editing && thought.keywords.length > 0 && (
          <div className="flex items-center gap-1 mt-1.5">
            <Link2 size={10} className="text-primary/40" />
            <span className="text-[10px] text-primary/50">{thought.keywords.slice(0, 3).join(" · ")}</span>
          </div>
        )}

        {/* Inline delete confirmation */}
        {isConfirmingDelete && (
          <div onClick={stop} className="mt-3 p-2.5 rounded-lg flex items-center justify-between gap-2"
            style={{ background: "hsl(var(--destructive) / 0.08)", border: "1px solid hsl(var(--destructive) / 0.3)" }}>
            <span className="text-[11px] text-destructive font-ui">Excluir permanentemente? Não dá pra desfazer.</span>
            <div className="flex items-center gap-1.5">
              <button onClick={onCancelDelete} className="text-[11px] font-ui px-2 py-1 text-muted-foreground">Cancelar</button>
              <button onClick={onConfirmDelete}
                className="text-[11px] font-bold font-ui px-2.5 py-1 rounded-md"
                style={{ background: "hsl(var(--destructive))", color: "hsl(var(--destructive-foreground))" }}>
                Excluir
              </button>
            </div>
          </div>
        )}
      </div>

      {isExpanded && analysis && !editing && (
        <div className="px-3.5 pb-4 pt-1 space-y-3 animate-fade-in"
          style={{ borderTop: "1px solid hsl(var(--border) / 0.5)" }} onClick={e => e.stopPropagation()}>
          {analysis.psychological_analysis && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[2px] text-muted-foreground/40 font-ui mb-1">🔬 Psicológica</p>
              <p className="text-xs text-foreground/70 font-body"><strong style={{ color: typeInfo.color }}>{analysis.psychological_analysis.pattern}</strong></p>
              <p className="text-xs text-muted-foreground/70 font-body mt-0.5">{analysis.psychological_analysis.explanation}</p>
              <p className="text-xs italic mt-1 font-body" style={{ color: "#8b9e7a" }}>↻ {analysis.psychological_analysis.reframe}</p>
            </div>
          )}
          {analysis.biblical_analysis && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[2px] text-muted-foreground/40 font-ui mb-1">📖 Bíblica</p>
              <p className="text-xs text-foreground/70 font-body"><strong className="text-primary">{analysis.biblical_analysis.principle}</strong></p>
              {analysis.biblical_analysis.verses?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {analysis.biblical_analysis.verses.map((v, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md text-[10px] italic font-body"
                      style={{ background: "hsl(var(--primary) / 0.06)", color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.15)" }}>📌 {v}</span>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground/70 font-body mt-1">{analysis.biblical_analysis.application}</p>
            </div>
          )}
          {analysis.diagnosis && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[2px] text-muted-foreground/40 font-ui mb-1">💊 Diagnóstico</p>
              <p className="text-xs font-bold text-foreground/80 font-body">"{analysis.diagnosis.summary}"</p>
              <p className="text-xs mt-1 font-body" style={{ color: "#8b9e7a" }}>⚡ {analysis.diagnosis.action}</p>
              <p className="text-xs mt-1 italic font-body text-primary/70">❓ {analysis.diagnosis.question}</p>
            </div>
          )}
          {analysis.resolved_connections && analysis.resolved_connections.length > 0 && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[2px] text-muted-foreground/40 font-ui mb-1">🔗 Conexões detectadas</p>
              <div className="space-y-1.5">
                {analysis.resolved_connections.map((c, i) => (
                  <div key={i} className="text-[11px] font-body p-2 rounded-md"
                    style={{ background: "hsl(var(--primary) / 0.04)", border: "1px solid hsl(var(--primary) / 0.12)" }}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[9px] uppercase tracking-wider font-bold text-primary/70">{c.type}</span>
                      <div className="flex-1 h-0.5 rounded-full bg-primary/10">
                        <div className="h-full rounded-full bg-primary/50" style={{ width: `${Math.round(c.strength * 100)}%` }} />
                      </div>
                      <span className="text-[9px] text-muted-foreground/50">{Math.round(c.strength * 100)}%</span>
                    </div>
                    <p className="text-foreground/70">{c.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {thought.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {thought.keywords.map((k, i) => (
                <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-ui"
                  style={{ background: "hsl(var(--muted) / 0.3)", color: "hsl(var(--muted-foreground))" }}>{k}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger }: { icon: any; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-ui transition-colors hover:bg-muted/40"
      style={{ color: danger ? "hsl(var(--destructive))" : "hsl(var(--foreground))" }}
    >
      <Icon size={13} />
      {label}
    </button>
  );
}
