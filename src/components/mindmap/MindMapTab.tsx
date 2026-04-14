import { useState, useCallback, useEffect, lazy, Suspense } from "react";
import { Loader2, Sparkles, PenTool, Clock, Trash2, Edit3 } from "lucide-react";
import MindMapInput from "./MindMapInput";
import type { AnalysisResult } from "./types";
import { supabase } from "@/integrations/supabase/client";

const MindMapCanvas = lazy(() => import("./MindMapCanvas"));
const ManualMindMapCanvas = lazy(() => import("./ManualMindMapCanvas"));

type Mode = "select" | "ai-input" | "ai-canvas" | "manual";

interface SavedMap {
  id: string;
  title: string;
  updated_at: string;
  created_at: string;
}

export default function MindMapTab({ userCodeId }: { userCodeId: string }) {
  const [mode, setMode] = useState<Mode>("select");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMaps, setSavedMaps] = useState<SavedMap[]>([]);
  const [loadingMaps, setLoadingMaps] = useState(true);
  const [editMapId, setEditMapId] = useState<string | null>(null);

  // Load saved maps
  const fetchMaps = useCallback(async () => {
    setLoadingMaps(true);
    const { data } = await supabase
      .from("mind_maps")
      .select("id, title, updated_at, created_at")
      .eq("user_code_id", userCodeId)
      .order("updated_at", { ascending: false });
    setSavedMaps((data as SavedMap[]) || []);
    setLoadingMaps(false);
  }, [userCodeId]);

  useEffect(() => {
    fetchMaps();
  }, [fetchMaps]);

  const deleteMap = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Excluir este mapa?")) return;
    await supabase.from("mind_maps").delete().eq("id", id);
    setSavedMaps(prev => prev.filter(m => m.id !== id));
  };

  const openMap = (id: string) => {
    setEditMapId(id);
    setMode("manual");
  };

  const createNewMap = () => {
    setEditMapId(null);
    setMode("manual");
  };

  const handleGenerate = useCallback(async (text: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-content`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) { setError(data?.error || `Erro ${res.status}`); return; }
      if (data?.result) { setAnalysis(data.result); setMode("ai-canvas"); }
      else { setError("Resposta inesperada da IA."); }
    } catch { setError("Erro de conexão. Verifique sua internet."); }
    finally { setLoading(false); }
  }, []);

  const fallback = (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="animate-spin text-primary" size={24} />
    </div>
  );

  if (mode === "ai-canvas" && analysis) {
    return (
      <div className="h-[calc(100vh-120px)] lg:h-screen w-full">
        <Suspense fallback={fallback}>
          <MindMapCanvas analysis={analysis} onClose={() => { setAnalysis(null); setMode("select"); }} />
        </Suspense>
      </div>
    );
  }

  if (mode === "manual") {
    return (
      <div className="h-[calc(100vh-120px)] lg:h-screen w-full">
        <Suspense fallback={fallback}>
          <ManualMindMapCanvas
            userCodeId={userCodeId}
            mapId={editMapId}
            onClose={() => { setMode("select"); fetchMaps(); }}
          />
        </Suspense>
      </div>
    );
  }

  if (mode === "ai-input") {
    return (
      <div className="pb-20">
        <div className="px-4 pt-4">
          <button onClick={() => setMode("select")} className="text-xs text-muted-foreground font-ui hover:text-foreground transition-colors mb-4">
            ← Voltar
          </button>
        </div>
        {error && (
          <div className="mx-4 p-3 rounded-xl text-sm font-ui text-center"
            style={{ background: "hsl(var(--destructive) / 0.1)", border: "1px solid hsl(var(--destructive) / 0.3)", color: "hsl(var(--destructive))" }}>
            {error}
          </div>
        )}
        <MindMapInput onGenerate={handleGenerate} loading={loading} />
      </div>
    );
  }

  // Mode Selection + Saved Maps
  return (
    <div className="flex flex-col items-center min-h-[60vh] px-4 py-8 animate-fade-in">
      <p className="text-[9px] tracking-[3px] uppercase text-primary/60 font-ui mb-2">Fascinação · 2026A</p>
      <h2 className="text-2xl font-bold text-foreground font-display tracking-wide mb-2">Mapa Mental</h2>
      <p className="text-sm text-muted-foreground font-body mb-8 text-center max-w-md">Escolha como deseja criar seu mapa de estudo</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg mb-10">
        <button onClick={() => setMode("ai-input")}
          className="flex flex-col items-center gap-3 p-7 rounded-2xl transition-all hover:-translate-y-1 active:scale-[0.98] text-center group"
          style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110"
            style={{ background: "hsl(var(--primary) / 0.1)" }}>
            <Sparkles size={26} className="text-primary" />
          </div>
          <div>
            <p className="font-display text-lg font-semibold text-foreground mb-1">Gerar com IA</p>
            <p className="text-[13px] text-muted-foreground font-body leading-relaxed">Transcreva áudio ou cole texto e a IA transforma em mapa visual</p>
          </div>
        </button>

        <button onClick={createNewMap}
          className="flex flex-col items-center gap-3 p-7 rounded-2xl transition-all hover:-translate-y-1 active:scale-[0.98] text-center group"
          style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110"
            style={{ background: "hsl(var(--primary) / 0.1)" }}>
            <PenTool size={26} className="text-primary" />
          </div>
          <div>
            <p className="font-display text-lg font-semibold text-foreground mb-1">Criar do Zero</p>
            <p className="text-[13px] text-muted-foreground font-body leading-relaxed">Canvas em branco para construir seu mapa manualmente</p>
          </div>
        </button>
      </div>

      {/* Saved Maps */}
      <div className="w-full max-w-lg">
        <h3 className="text-sm font-display font-semibold text-foreground mb-3 flex items-center gap-2">
          <Clock size={14} className="text-primary/60" />
          Mapas Salvos
        </h3>
        {loadingMaps ? (
          <div className="flex justify-center py-6"><Loader2 className="animate-spin text-primary/40" size={20} /></div>
        ) : savedMaps.length === 0 ? (
          <p className="text-[13px] text-muted-foreground/50 font-body text-center py-6">Nenhum mapa salvo ainda</p>
        ) : (
          <div className="space-y-2">
            {savedMaps.map(map => (
              <button key={map.id} onClick={() => openMap(map.id)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all hover:-translate-y-0.5 active:scale-[0.99] group"
                style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                <div className="flex items-center gap-3 min-w-0">
                  <Edit3 size={14} className="text-primary/50 flex-shrink-0" />
                  <div className="text-left min-w-0">
                    <p className="text-sm font-display font-semibold text-foreground truncate">{map.title}</p>
                    <p className="text-[11px] text-muted-foreground/50 font-ui">
                      {new Date(map.updated_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
                <button onClick={(e) => deleteMap(map.id, e)}
                  className="p-2 rounded-lg text-muted-foreground/30 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                  title="Excluir">
                  <Trash2 size={14} />
                </button>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
