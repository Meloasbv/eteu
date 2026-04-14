import { useState, useCallback, lazy, Suspense } from "react";
import { Loader2, Sparkles, PenTool } from "lucide-react";
import MindMapInput from "./MindMapInput";
import type { AnalysisResult } from "./types";

const MindMapCanvas = lazy(() => import("./MindMapCanvas"));
const ManualMindMapCanvas = lazy(() => import("./ManualMindMapCanvas"));

type Mode = "select" | "ai-input" | "ai-canvas" | "manual";

export default function MindMapTab() {
  const [mode, setMode] = useState<Mode>("select");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      if (!res.ok || data?.error) {
        setError(data?.error || `Erro ${res.status}`);
        return;
      }

      if (data?.result) {
        setAnalysis(data.result);
        setMode("ai-canvas");
      } else {
        setError("Resposta inesperada da IA.");
      }
    } catch (e: any) {
      setError("Erro de conexão. Verifique sua internet.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fallback = (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="animate-spin text-primary" size={24} />
    </div>
  );

  // AI Canvas
  if (mode === "ai-canvas" && analysis) {
    return (
      <div className="h-[calc(100vh-120px)] lg:h-screen w-full">
        <Suspense fallback={fallback}>
          <MindMapCanvas analysis={analysis} onClose={() => { setAnalysis(null); setMode("select"); }} />
        </Suspense>
      </div>
    );
  }

  // Manual Canvas
  if (mode === "manual") {
    return (
      <div className="h-[calc(100vh-120px)] lg:h-screen w-full">
        <Suspense fallback={fallback}>
          <ManualMindMapCanvas onClose={() => setMode("select")} />
        </Suspense>
      </div>
    );
  }

  // AI Input
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
            style={{
              background: "hsl(var(--destructive) / 0.1)",
              border: "1px solid hsl(var(--destructive) / 0.3)",
              color: "hsl(var(--destructive))",
            }}>
            {error}
          </div>
        )}
        <MindMapInput onGenerate={handleGenerate} loading={loading} />
      </div>
    );
  }

  // Mode Selection
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-8 animate-fade-in">
      <p className="text-[9px] tracking-[3px] uppercase text-primary/60 font-ui mb-2">
        Fascinação · 2026A
      </p>
      <h2 className="text-2xl font-bold text-foreground font-display tracking-wide mb-2">
        Mapa Mental
      </h2>
      <p className="text-sm text-muted-foreground font-body mb-10 text-center max-w-md">
        Escolha como deseja criar seu mapa de estudo
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
        {/* AI Mode */}
        <button
          onClick={() => setMode("ai-input")}
          className="flex flex-col items-center gap-3 p-7 rounded-2xl transition-all hover:-translate-y-1 active:scale-[0.98] text-center group"
          style={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
          }}
        >
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110"
            style={{ background: "hsl(var(--primary) / 0.1)" }}>
            <Sparkles size={26} className="text-primary" />
          </div>
          <div>
            <p className="font-display text-lg font-semibold text-foreground mb-1">Gerar com IA</p>
            <p className="text-[13px] text-muted-foreground font-body leading-relaxed">
              Transcreva áudio ou cole texto e a IA transforma em mapa visual
            </p>
          </div>
        </button>

        {/* Manual Mode */}
        <button
          onClick={() => setMode("manual")}
          className="flex flex-col items-center gap-3 p-7 rounded-2xl transition-all hover:-translate-y-1 active:scale-[0.98] text-center group"
          style={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
          }}
        >
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110"
            style={{ background: "hsl(var(--primary) / 0.1)" }}>
            <PenTool size={26} className="text-primary" />
          </div>
          <div>
            <p className="font-display text-lg font-semibold text-foreground mb-1">Criar do Zero</p>
            <p className="text-[13px] text-muted-foreground font-body leading-relaxed">
              Canvas em branco para construir seu mapa manualmente, com cards e conexões
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
