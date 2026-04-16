import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { haptic } from "@/hooks/useHaptic";
import { Brain, Mic, MicOff, Sparkles, ChevronDown, ChevronUp, Link2, Search, X, MessageSquare, Map, BarChart3 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Json } from "@/integrations/supabase/types";

const ThoughtGraph = lazy(() => import("./ThoughtGraph"));
const PatternsView = lazy(() => import("./PatternsView"));

// ── Types ──
type ThoughtType = "problema" | "insight" | "estudo" | "reflexão" | "oração" | "decisão" | "emocional" | "ideia" | "pergunta";

interface ThoughtAnalysis {
  detected_type?: ThoughtType;
  psychological_analysis?: { pattern: string; explanation: string; reframe: string };
  biblical_analysis?: { principle: string; verses: string[]; application: string };
  diagnosis?: { summary: string; action: string; question: string };
  keywords?: string[];
  connections?: { search_terms: string[]; possible_themes: string[] };
  emotion_score?: { valence: number; intensity: number };
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

type ViewMode = "capture" | "graph" | "patterns";

// ── Main Component ──
export default function SecondBrainTab({ userCodeId }: { userCodeId: string }) {
  const [viewMode, setViewMode] = useState<ViewMode>("capture");
  const [content, setContent] = useState("");
  const [selectedType, setSelectedType] = useState<ThoughtType | "auto">("auto");
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [isListening, setIsListening] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { loadThoughts(); }, [userCodeId]);

  const loadThoughts = async () => {
    const { data } = await supabase
      .from("thoughts").select("*").eq("user_code_id", userCodeId)
      .order("created_at", { ascending: false }).limit(50);
    if (data) {
      setThoughts(data.map(t => ({
        ...t, keywords: (t.keywords as string[]) || [],
        analysis: t.analysis ? (t.analysis as unknown as ThoughtAnalysis) : null,
        emotion_valence: Number(t.emotion_valence) || 0, emotion_intensity: Number(t.emotion_intensity) || 0,
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
    const newThought: Thought = { ...inserted, keywords: [], analysis: null, emotion_valence: 0, emotion_intensity: 0 };
    setThoughts(prev => [newThought, ...prev]);
    setContent(""); setSelectedType("auto");
    if (textareaRef.current) textareaRef.current.style.height = "120px";
    setIsRegistering(false);
    analyzeThought(newThought);
  };

  const analyzeThought = async (thought: Thought) => {
    setAnalyzingIds(prev => new Set(prev).add(thought.id));
    try {
      const recentForContext = thoughts.slice(0, 10).map(t => ({ type: t.type, content: t.content }));
      const { data, error } = await supabase.functions.invoke("analyze-thought", {
        body: { content: thought.content, recentThoughts: recentForContext },
      });
      if (error || data?.error) return;
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
      if (keywords.length > 0) findAndSaveConnections(thought.id, keywords);
    } catch (e) { console.error("Analysis failed:", e);
    } finally { setAnalyzingIds(prev => { const n = new Set(prev); n.delete(thought.id); return n; }); }
  };

  const findAndSaveConnections = async (thoughtId: string, keywords: string[]) => {
    const { data: connected } = await supabase.from("thoughts").select("id, keywords")
      .eq("user_code_id", userCodeId).neq("id", thoughtId).overlaps("keywords", keywords).limit(5);
    if (connected && connected.length > 0) {
      const conns = connected.map(c => ({ user_code_id: userCodeId, thought_a: thoughtId, thought_b: c.id, connection_type: "keyword", strength: 0.5 }));
      await supabase.from("thought_connections").upsert(conns, { onConflict: "thought_a,thought_b" });
    }
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

  const filtered = searchQuery
    ? thoughts.filter(t => t.content.toLowerCase().includes(searchQuery.toLowerCase()) || t.keywords.some(k => k.toLowerCase().includes(searchQuery.toLowerCase())))
    : thoughts;

  const TABS: { key: ViewMode; icon: any; label: string }[] = [
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
              <button onClick={() => { setShowSearch(!showSearch); if (showSearch) setSearchQuery(""); }} className="text-muted-foreground hover:text-foreground transition-colors">
                {showSearch ? <X size={16} /> : <Search size={16} />}
              </button>
            </div>
            {showSearch && (
              <input autoFocus value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar pensamentos..."
                className="w-full mb-3 px-3 py-2 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/40" />
            )}

            <div className="space-y-2.5">
              {filtered.map(thought => (
                <ThoughtCard key={thought.id} thought={thought} isExpanded={expandedId === thought.id}
                  isAnalyzing={analyzingIds.has(thought.id)}
                  onToggle={() => { setExpandedId(expandedId === thought.id ? null : thought.id); haptic("light"); }} />
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
function ThoughtCard({ thought, isExpanded, isAnalyzing, onToggle }: {
  thought: Thought; isExpanded: boolean; isAnalyzing: boolean; onToggle: () => void;
}) {
  const typeInfo = getTypeInfo(thought.type);
  const analysis = thought.analysis;

  return (
    <div className="rounded-xl transition-all duration-200 cursor-pointer"
      style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderLeft: `3px solid ${typeInfo.color}` }}
      onClick={onToggle}>
      <div className="p-3.5">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: typeInfo.color }}>{typeInfo.emoji} {typeInfo.label}</span>
            <span className="text-[10px] text-muted-foreground/50">{timeAgo(thought.created_at)}</span>
          </div>
          <div className="flex items-center gap-1">
            {isAnalyzing && <span className="text-[10px] text-primary animate-pulse font-ui">Analisando...</span>}
            {isExpanded ? <ChevronUp size={14} className="text-muted-foreground/40" /> : <ChevronDown size={14} className="text-muted-foreground/40" />}
          </div>
        </div>
        <p className={`text-sm text-foreground/80 font-body leading-relaxed ${!isExpanded ? "line-clamp-2" : ""}`}>{thought.content}</p>
        {!isExpanded && analysis?.diagnosis?.summary && (
          <p className="text-[11px] text-muted-foreground/60 mt-1.5 italic font-body line-clamp-1">💊 {analysis.diagnosis.summary}</p>
        )}
        {!isExpanded && thought.keywords.length > 0 && (
          <div className="flex items-center gap-1 mt-1.5">
            <Link2 size={10} className="text-primary/40" />
            <span className="text-[10px] text-primary/50">{thought.keywords.slice(0, 3).join(" · ")}</span>
          </div>
        )}
      </div>
      {isExpanded && analysis && (
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
