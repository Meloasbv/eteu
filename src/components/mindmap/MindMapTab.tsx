import { useState, useCallback, lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import MindMapInput from "./MindMapInput";
import type { AnalysisResult } from "./types";

const MindMapCanvas = lazy(() => import("./MindMapCanvas"));

export default function MindMapTab() {
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
      } else {
        setError("Resposta inesperada da IA.");
      }
    } catch (e: any) {
      setError("Erro de conexão. Verifique sua internet.");
    } finally {
      setLoading(false);
    }
  }, []);

  if (analysis) {
    return (
      <div className="h-[calc(100vh-120px)] lg:h-screen w-full">
        <Suspense fallback={
          <div className="flex items-center justify-center h-full">
            <Loader2 className="animate-spin text-primary" size={24} />
          </div>
        }>
          <MindMapCanvas analysis={analysis} onClose={() => setAnalysis(null)} />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {error && (
        <div className="mx-4 mt-4 p-3 rounded-xl text-sm font-ui text-center"
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
