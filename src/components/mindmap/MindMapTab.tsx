import { useState, useCallback, useEffect, lazy, Suspense } from "react";
import { Loader2, Sparkles, PenTool, Clock, Trash2, Edit3, FileText } from "lucide-react";
import MindMapInput from "./MindMapInput";
import PipelineProgressView from "./PipelineProgress";
import type { AnalysisResult } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { setCachedMap, getCachedMap, setInflight, getInflight } from "./mapCache";
import { runMindMapPipeline, type PipelineProgress } from "@/lib/mindMapPipeline";

const ManualMindMapCanvas = lazy(() => import("./ManualMindMapCanvas"));
const StudyGuide = lazy(() => import("@/components/study-guide/StudyGuide"));
// Warm canvas chunk in the background so first open is instant
if (typeof window !== "undefined") {
  setTimeout(() => { import("./ManualMindMapCanvas"); import("@/components/study-guide/StudyGuide"); }, 800);
}

type Mode = "select" | "ai-input" | "ai-canvas" | "ai-guide" | "manual" | "pdf-processing";

interface SavedMap {
  id: string;
  title: string;
  updated_at: string;
  created_at: string;
  source_type: string | null;
}

type PdfStage = "uploading" | "extracting" | "pipeline";

interface PdfState {
  stage: PdfStage;
  fileName: string;
  pages?: number;
  pipeline: PipelineProgress | null;
}

export default function MindMapTab({ userCodeId }: { userCodeId: string }) {
  const [mode, setMode] = useState<Mode>("select");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMaps, setSavedMaps] = useState<SavedMap[]>([]);
  const [loadingMaps, setLoadingMaps] = useState(true);
  const [editMapId, setEditMapId] = useState<string | null>(null);
  const [aiMapId, setAiMapId] = useState<string | null>(null);
  const [pdfState, setPdfState] = useState<PdfState | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  const saveAiMap = useCallback(async (result: AnalysisResult, existingMapId: string | null = null) => {
    let currentStudyNotes: Record<string, unknown> = {};
    let shouldUpdateExistingMap = false;

    if (existingMapId) {
      const { data: existingMap, error: existingMapError } = await supabase
        .from("mind_maps")
        .select("id, study_notes")
        .eq("id", existingMapId)
        .maybeSingle();

      if (existingMapError) throw existingMapError;

      if (existingMap?.id) {
        shouldUpdateExistingMap = true;
        currentStudyNotes = (existingMap.study_notes as Record<string, unknown> | null) ?? {};
      }
    }

    const payload = {
      user_code_id: userCodeId,
      title: result.main_theme || "Mapa IA",
      nodes: (result.key_concepts || []) as any,
      edges: [] as any,
      source_type: "ai",
      updated_at: new Date().toISOString(),
      study_notes: {
        ...currentStudyNotes,
        analysis: result,
      } as any,
    };

    const { data, error } = shouldUpdateExistingMap
      ? await supabase
          .from("mind_maps")
          .update(payload)
          .eq("id", existingMapId)
          .select("id")
          .single()
      : await supabase
          .from("mind_maps")
          .insert(payload)
          .select("id")
          .single();

    if (error) throw error;
    if (!data?.id) throw new Error("Não foi possível salvar o mapa.");

    setAiMapId(data.id);
    return data.id;
  }, [userCodeId]);

  const fetchMaps = useCallback(async () => {
    setLoadingMaps(true);
    const { data } = await supabase
      .from("mind_maps")
      .select("id, title, updated_at, created_at, source_type")
      .eq("user_code_id", userCodeId)
      .order("updated_at", { ascending: false });
    setSavedMaps((data as SavedMap[]) || []);
    setLoadingMaps(false);
  }, [userCodeId]);

  useEffect(() => { fetchMaps(); }, [fetchMaps]);

  const deleteMap = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Excluir este mapa?")) return;
    await supabase.from("mind_maps").delete().eq("id", id);
    setSavedMaps(prev => prev.filter(m => m.id !== id));
  };

  // Prefetch full map data + warm canvas chunk on hover/focus for instant open
  const prefetchMap = useCallback((id: string) => {
    if (getCachedMap(id) || getInflight(id)) return;
    import("./ManualMindMapCanvas"); // ensure chunk warm
    const p = (async () => {
      const { data } = await supabase.from("mind_maps").select("*").eq("id", id).single();
      if (data) setCachedMap(id, data as any);
      return data as any;
    })();
    setInflight(id, p);
  }, []);

  const openMap = useCallback(async (id: string) => {
    // Optimistically use cache if present
    const cached = getCachedMap(id);
    const resolveAndOpen = (row: any) => {
      if (!row) { setError("Não foi possível abrir o mapa."); return; }
      const sn = (row.study_notes as Record<string, unknown> | null) ?? {};
      const storedAnalysis = (sn as any).analysis as AnalysisResult | undefined;
      const isAi = row.source_type === "ai" || !!storedAnalysis;
      if (isAi && storedAnalysis) {
        setAnalysis(storedAnalysis);
        setAiMapId(row.id);
        setMode("ai-guide");
      } else {
        setEditMapId(id);
        setMode("manual");
      }
    };
    if (cached) { resolveAndOpen(cached); return; }
    const inflight = getInflight(id);
    setLoading(true);
    try {
      const row = inflight
        ? await inflight
        : await (async () => {
            const { data } = await supabase.from("mind_maps").select("*").eq("id", id).single();
            if (data) setCachedMap(id, data as any);
            return data as any;
          })();
      resolveAndOpen(row);
    } catch (e) {
      console.error("openMap failed", e);
      setError("Erro ao abrir o mapa. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);
  const createNewMap = () => { setEditMapId(null); setMode("manual"); };

  const handleGenerate = useCallback(async (text: string, audios?: import("./types").SourceAudio[]) => {
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
      if (data?.result) {
        const result: AnalysisResult = audios && audios.length > 0
          ? { ...data.result, source_audios: audios }
          : data.result;
        const savedMapId = await saveAiMap(result);
        setAnalysis(result);
        setAiMapId(savedMapId);
        await fetchMaps();
        setMode("ai-guide");
      }
      else { setError("Resposta inesperada da IA."); }
    } catch (error) {
      console.error("Mind map generation failed:", error);
      setError(error instanceof Error ? error.message : "Erro de conexão. Verifique sua internet.");
    }
    finally { setLoading(false); }
  }, [saveAiMap, fetchMaps]);

  const handlePdfUpload = useCallback(async (file: File) => {
    if (!file || !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Selecione um arquivo PDF válido.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("Arquivo muito grande. Máximo 20MB.");
      return;
    }

    setError(null);
    setMode("pdf-processing");
    setPdfState({ stage: "uploading", fileName: file.name, pipeline: null });

    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      setPdfState({ stage: "extracting", fileName: file.name, pipeline: null });

      const extractUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-pdf`;
      const extractRes = await fetch(extractUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ pdfBase64: base64 }),
      });
      const extractData = await extractRes.json();
      if (!extractRes.ok || extractData?.error) {
        setError(extractData?.error || "Erro ao extrair texto do PDF.");
        setMode("select");
        setPdfState(null);
        return;
      }

      const pages = (extractData.pagesText as { page: number; text: string }[]) || [];
      if (pages.length === 0) {
        setError("Não foi possível extrair texto deste PDF.");
        setMode("select");
        setPdfState(null);
        return;
      }

      // Run new pipeline (one AI call per group, in parallel)
      const pdfTitle = file.name.replace(/\.pdf$/i, "").trim() || "Estudo";
      const result = await runMindMapPipeline({
        pagesText: pages,
        pdfTitle,
        onProgress: (progress) => {
          setPdfState({
            stage: "pipeline",
            fileName: file.name,
            pages: extractData.pages,
            pipeline: progress,
          });
        },
      });

      const savedMapId = await saveAiMap(result);
      setAnalysis(result);
      setAiMapId(savedMapId);
      await fetchMaps();
      setMode("ai-guide");
    } catch (error) {
      console.error("PDF mind map generation failed:", error);
      setError(error instanceof Error ? error.message : "Erro de conexão. Verifique sua internet.");
      setMode("select");
    } finally {
      setPdfState(null);
    }
  }, [fetchMaps, saveAiMap]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handlePdfUpload(file);
  }, [handlePdfUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  // Skeleton that mimics the canvas layout — feels instant even while data loads
  const fallback = (
    <div className="h-full w-full relative overflow-hidden" style={{ background: "hsl(var(--background))" }}>
      <div className="absolute inset-0 opacity-30"
        style={{ backgroundImage: "radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center animate-pulse"
            style={{ background: "hsl(var(--primary) / 0.1)", border: "1px solid hsl(var(--primary) / 0.2)" }}>
            <Loader2 className="animate-spin text-primary" size={20} />
          </div>
          <p className="text-xs font-ui text-muted-foreground/60">Abrindo mapa…</p>
        </div>
      </div>
    </div>
  );

  if (mode === "pdf-processing" && pdfState) {
    const preStep =
      pdfState.stage === "uploading" ? "uploading" :
      pdfState.stage === "extracting" ? "extracting" :
      null;
    return (
      <PipelineProgressView
        fileName={pdfState.fileName}
        progress={pdfState.pipeline}
        preExtractStep={preStep as any}
        pages={pdfState.pages}
      />
    );
  }

  if ((mode === "ai-guide" || mode === "ai-canvas") && analysis) {
    return (
      <div className="h-full w-full">
        <Suspense fallback={fallback}>
          <StudyGuide
            analysis={analysis}
            activeSectionId={activeSectionId}
            onActiveSectionChange={setActiveSectionId}
            mapId={aiMapId}
            onEnsureSavedForShare={() => saveAiMap(analysis, aiMapId)}
            onBack={() => { setAnalysis(null); setAiMapId(null); setActiveSectionId(null); setMode("select"); }}
          />
        </Suspense>
      </div>
    );
  }

  if (mode === "manual") {
    return (
      <div className="h-full w-full">
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
        <MindMapInput onGenerate={handleGenerate} loading={loading} userCodeId={userCodeId} />
      </div>
    );
  }

  // Mode Selection + Saved Maps
  return (
    <div className="flex flex-col items-center min-h-[60vh] px-4 py-8 animate-fade-in">
      <p className="text-[9px] tracking-[3px] uppercase text-primary/60 font-ui mb-2">Fascinação · 2026A</p>
      <h2 className="text-2xl font-bold text-foreground font-display tracking-wide mb-2">Mapa Mental</h2>
      <p className="text-sm text-muted-foreground font-body mb-8 text-center max-w-md">Escolha como deseja criar seu mapa de estudo</p>

      {error && (
        <div className="w-full max-w-lg mx-auto mb-6 p-3 rounded-xl text-sm font-ui text-center"
          style={{ background: "hsl(var(--destructive) / 0.1)", border: "1px solid hsl(var(--destructive) / 0.3)", color: "hsl(var(--destructive))" }}>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl mb-10">
        <button onClick={() => setMode("ai-input")}
          className="flex flex-col items-center gap-3 p-7 rounded-2xl transition-all hover:-translate-y-1 active:scale-[0.98] text-center group"
          style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110"
            style={{ background: "hsl(var(--primary) / 0.1)" }}>
            <Sparkles size={26} className="text-primary" />
          </div>
          <div>
            <p className="font-display text-lg font-semibold text-foreground mb-1">Gerar com IA</p>
            <p className="text-[13px] text-muted-foreground font-body leading-relaxed">Texto ou áudio → mapa visual</p>
          </div>
        </button>

        {/* PDF Upload */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <button
            onClick={() => document.getElementById("pdf-upload-input")?.click()}
            className={`flex flex-col items-center gap-3 p-7 rounded-2xl transition-all hover:-translate-y-1 active:scale-[0.98] text-center group w-full ${isDragging ? "scale-[1.02]" : ""}`}
            style={{
              background: isDragging ? "hsl(var(--primary) / 0.06)" : "hsl(var(--card))",
              border: isDragging ? "2px dashed hsl(var(--primary) / 0.5)" : "1px solid hsl(var(--border))",
            }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110"
              style={{ background: "hsl(var(--primary) / 0.1)" }}>
              <FileText size={26} className="text-primary" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-foreground mb-1">Upload PDF</p>
              <p className="text-[13px] text-muted-foreground font-body leading-relaxed">Suba o PDF e a IA cria o mapa</p>
            </div>
          </button>
          <input
            id="pdf-upload-input"
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handlePdfUpload(file);
              e.target.value = "";
            }}
          />
        </div>

        <button onClick={createNewMap}
          className="flex flex-col items-center gap-3 p-7 rounded-2xl transition-all hover:-translate-y-1 active:scale-[0.98] text-center group"
          style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110"
            style={{ background: "hsl(var(--primary) / 0.1)" }}>
            <PenTool size={26} className="text-primary" />
          </div>
          <div>
            <p className="font-display text-lg font-semibold text-foreground mb-1">Criar do Zero</p>
            <p className="text-[13px] text-muted-foreground font-body leading-relaxed">Canvas em branco para construir</p>
          </div>
        </button>
      </div>

      {/* Saved Maps */}
      <div className="w-full max-w-2xl">
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
                onMouseEnter={() => prefetchMap(map.id)}
                onFocus={() => prefetchMap(map.id)}
                onTouchStart={() => prefetchMap(map.id)}
                disabled={loading}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all hover:-translate-y-0.5 active:scale-[0.99] group disabled:opacity-60"
                style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                <div className="flex items-center gap-3 min-w-0">
                  {loading ? (
                    <Loader2 size={14} className="text-primary/60 flex-shrink-0 animate-spin" />
                  ) : map.source_type === "ai" ? (
                    <Sparkles size={14} className="text-primary/60 flex-shrink-0" />
                  ) : (
                    <Edit3 size={14} className="text-primary/50 flex-shrink-0" />
                  )}
                  <div className="text-left min-w-0">
                    <p className="text-sm font-display font-semibold text-foreground truncate">{map.title}</p>
                    <p className="text-[11px] text-muted-foreground/50 font-ui">
                      {map.source_type === "ai" ? "IA · " : ""}
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
