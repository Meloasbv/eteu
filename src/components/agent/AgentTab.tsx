import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import RecordingView from "./RecordingView";
import StudyHub from "./StudyHub";
import SessionsList from "./SessionsList";
import { Mic, Upload } from "lucide-react";
import type { StudySessionRow, DetectedTopic, PersonalNote } from "./types";
import type { AnalysisResult } from "@/components/mindmap/types";
import { uploadAudio } from "@/lib/audioStudio";
import { transcribeAudioBlob } from "@/lib/audioStudio";
import { haptic } from "@/hooks/useHaptic";

interface Props { userCodeId: string }

type Mode = "idle" | "recording" | "processing" | "hub";

export default function AgentTab({ userCodeId }: Props) {
  const [mode, setMode] = useState<Mode>("idle");
  const [activeSession, setActiveSession] = useState<StudySessionRow | null>(null);
  const [resumeSession, setResumeSession] = useState<StudySessionRow | null>(null);
  const [sessions, setSessions] = useState<StudySessionRow[]>([]);
  const [progress, setProgress] = useState<{ label: string; pct: number } | null>(null);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("study_sessions")
      .select("*")
      .eq("user_code_id", userCodeId)
      .order("created_at", { ascending: false });
    setSessions((data as any) || []);
  }, [userCodeId]);

  useEffect(() => { refresh(); }, [refresh]);

  /** Persiste a sessão e dispara a geração de estudo. Se resumeOf for passado, atualiza linha existente. */
  const finalizeSession = useCallback(async (payload: {
    title: string;
    duration: number;
    transcript: string;
    topics: DetectedTopic[];
    personalNotes: PersonalNote[];
    audioBlob: Blob | null;
    sourceType: "live" | "upload";
    layout?: { positions: Record<string, { x: number; y: number }>; edges: any[] };
    resumeOf?: StudySessionRow | null;
    priorTranscript?: string;
  }) => {
    setMode("processing");
    setProgress({ label: "Salvando sessão…", pct: 10 });

    let audioUrl: string | null = null;
    if (payload.audioBlob) {
      try {
        setProgress({ label: "Enviando áudio…", pct: 20 });
        audioUrl = await uploadAudio(userCodeId, payload.audioBlob);
      } catch (e) {
        console.warn("upload audio falhou", e);
      }
    }

    setProgress({ label: "Gerando material de estudo…", pct: 50 });

    let generated: AnalysisResult | null = null;
    try {
      const { data, error } = await supabase.functions.invoke("agent-build-study", {
        body: { transcript: payload.transcript, topics: payload.topics },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      generated = data as AnalysisResult;
      if (audioUrl) {
        generated.source_audios = [{
          url: audioUrl,
          label: "Gravação completa",
          duration_seconds: payload.duration,
          mime_type: payload.audioBlob?.type || "audio/webm",
        }];
      }
    } catch (e: any) {
      toast({ title: "Falha ao gerar estudo", description: e?.message, variant: "destructive" });
    }

    // Cria mapa mental persistido a partir dos tópicos + layout do canvas ao vivo
    setProgress({ label: "Salvando mapa mental…", pct: 75 });
    let mindMapId: string | null = null;
    try {
      const sessionTitle = payload.title || generated?.main_theme || "Sessão";
      const positions = payload.layout?.positions || {};
      const liveEdges = payload.layout?.edges || [];

      // Nó raiz central
      const rootId = "root";
      const nodes: any[] = [{
        id: rootId,
        type: "manualRoot",
        position: { x: 0, y: -180 },
        data: { label: sessionTitle.slice(0, 60) },
      }];

      // Nós de tópico — preserva posições do canvas ao vivo se existirem
      payload.topics.forEach((t, i) => {
        const cols = 3;
        const colW = 240;
        const rowH = 130;
        const col = i % cols;
        const row = Math.floor(i / cols);
        const fallback = { x: (col - 1) * colW, y: row * rowH + 60 };
        nodes.push({
          id: t.id,
          type: "simpleNode",
          position: positions[t.id] || fallback,
          data: {
            title: t.title,
            description: t.keyPoints?.[0] || "",
            color: "#c4a46a",
            colorMode: "border",
            level: "title",
          },
        });
      });

      // Edges raiz → tópico (apenas para os que ainda não foram conectados manualmente)
      const manualEdges = liveEdges.map((e: any) => ({
        id: e.id || `e-${e.source}-${e.target}`,
        source: e.source,
        target: e.target,
        type: "smoothstep",
      }));
      const connectedFromRoot = new Set(
        manualEdges.filter((e: any) => e.source === rootId).map((e: any) => e.target)
      );
      const rootEdges = payload.topics
        .filter((t) => !connectedFromRoot.has(t.id))
        .map((t) => ({ id: `er-${t.id}`, source: rootId, target: t.id, type: "smoothstep" }));
      const edges = [...rootEdges, ...manualEdges];

      const { data: mm, error: mmErr } = await supabase
        .from("mind_maps")
        .insert({
          user_code_id: userCodeId,
          title: sessionTitle,
          source_type: "agent",
          nodes: nodes as any,
          edges: edges as any,
        })
        .select("id")
        .single();
      if (mmErr) throw mmErr;
      mindMapId = mm.id;
    } catch (e) {
      console.warn("[finalize] mind map", e);
    }

    setProgress({ label: "Concluindo…", pct: 90 });

    const baseFields = {
      title: payload.title || generated?.main_theme || "Sessão sem título",
      duration_seconds: payload.duration,
      source_type: payload.sourceType,
      full_transcript: payload.transcript,
      topics: payload.topics as any,
      generated_study: generated as any,
      personal_notes: payload.personalNotes as any,
      mind_map_id: mindMapId,
    };

    let row: any = null;
    let error: any = null;
    if (payload.resumeOf?.id) {
      // Continuação: atualiza a linha existente. Mantém audio_url anterior se nada novo gravado.
      const updateFields: any = { ...baseFields };
      if (audioUrl) updateFields.audio_url = audioUrl;
      const r = await supabase
        .from("study_sessions")
        .update(updateFields)
        .eq("id", payload.resumeOf.id)
        .select("*")
        .single();
      row = r.data; error = r.error;
    } else {
      const r = await supabase
        .from("study_sessions")
        .insert({ user_code_id: userCodeId, audio_url: audioUrl, ...baseFields })
        .select("*")
        .single();
      row = r.data; error = r.error;
    }

    if (error || !row) {
      toast({ title: "Erro ao salvar", description: error?.message, variant: "destructive" });
      setMode("idle");
      setProgress(null);
      return;
    }
    setActiveSession(row as any);
    setResumeSession(null);
    await refresh();
    setMode("hub");
    setProgress(null);
    haptic("medium");
  }, [userCodeId, refresh]);

  /** Upload de MP3/áudio existente. */
  const handleFileUpload = useCallback(async (file: File) => {
    if (file.size > 25 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 25MB.", variant: "destructive" });
      return;
    }
    setMode("processing");
    setProgress({ label: "Transcrevendo áudio…", pct: 30 });
    try {
      const text = await transcribeAudioBlob(file);
      await finalizeSession({
        title: file.name.replace(/\.[^/.]+$/, ""),
        duration: 0,
        transcript: text,
        topics: [],
        personalNotes: [],
        audioBlob: file,
        sourceType: "upload",
      });
    } catch (e: any) {
      toast({ title: "Falha na transcrição", description: e?.message, variant: "destructive" });
      setMode("idle");
      setProgress(null);
    }
  }, [finalizeSession]);

  const openSession = useCallback((s: StudySessionRow) => {
    setActiveSession(s);
    setMode("hub");
  }, []);

  const deleteSession = useCallback(async (id: string) => {
    await supabase.from("study_sessions").delete().eq("id", id);
    refresh();
  }, [refresh]);

  // ── render ──
  if (mode === "hub" && activeSession) {
    return (
      <StudyHub
        session={activeSession}
        userCodeId={userCodeId}
        onBack={() => { setActiveSession(null); setMode("idle"); refresh(); }}
        onUpdate={(s) => setActiveSession(s)}
        onResume={(s) => { setResumeSession(s); setActiveSession(null); setMode("recording"); }}
      />
    );
  }

  if (mode === "recording") {
    return (
      <RecordingView
        userCodeId={userCodeId}
        initialSession={resumeSession}
        onCancel={() => { setResumeSession(null); setMode("idle"); }}
        onFinish={finalizeSession}
      />
    );
  }

  if (mode === "processing") {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-6 px-6">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center animate-pulse"
          style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.3), hsl(var(--primary) / 0.08))", border: "1px solid hsl(var(--primary) / 0.5)" }}
        >
          <Mic size={28} className="text-primary" />
        </div>
        <div className="text-center max-w-sm">
          <h3 className="font-display text-lg text-foreground">Gerando seu material de estudo…</h3>
          <p className="text-sm text-muted-foreground mt-2">{progress?.label}</p>
        </div>
        <div className="w-full max-w-sm h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${progress?.pct ?? 0}%`, background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.6))" }}
          />
        </div>
      </div>
    );
  }

  // idle
  return (
    <div className="px-4 lg:px-0 pb-20">
      <div className="max-w-2xl mx-auto pt-8">
        {/* Hero */}
        <div className="flex flex-col items-center text-center gap-4 py-12">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary) / 0.25), hsl(var(--primary) / 0.06))",
              border: "1px solid hsl(var(--primary) / 0.4)",
              boxShadow: "0 0 40px -10px hsl(var(--primary) / 0.4)",
            }}
          >
            <Mic size={36} className="text-primary" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="font-display text-xl text-foreground">Agente de Estudo</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-xs">
              Grave uma aula ou pregação e eu transformo em estudo completo
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <button
              onClick={() => { haptic("medium"); setMode("recording"); }}
              className="px-6 py-3 rounded-full font-ui text-sm font-bold flex items-center gap-2 transition-all hover:scale-[1.02]"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.85))",
                color: "hsl(var(--primary-foreground))",
                boxShadow: "0 8px 30px -8px hsl(var(--primary) / 0.6)",
              }}
            >
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Gravar
            </button>
            <label className="px-6 py-3 rounded-full font-ui text-sm flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground border border-border/50 hover:border-primary/40 transition-all">
              <Upload size={14} /> Enviar áudio
              <input
                type="file"
                accept="audio/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileUpload(f);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </div>

        {/* Sessões anteriores */}
        <SessionsList sessions={sessions} onOpen={openSession} onDelete={deleteSession} />
      </div>
    </div>
  );
}
